import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
import unicodedata
import re
import time
import edge_tts  # 文本转语音
import asyncio
from app.core.knowledge_base import KnowledgeBase
from app.utils.config import Config
from app.database.relational_database import (
    pic2word,
    question_list,
    FAQ,
    all_tags,
    architect_tags
)

app = Flask(__name__, 
            template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates'), 
            static_folder=os.path.join(os.path.dirname(__file__), '..', 'static'))
app.secret_key = 'chat-secret-key'

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 初始化知识库
knowledge_base = KnowledgeBase()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        data_json = request.get_json()
        user_inputpic = data_json.get('image', '')
        # 图片识别
        if user_inputpic:
            time.sleep(5)
            answer = pic2word.get(user_inputpic, "抱歉，无法识别该图片。")
            asyncio.run(async_text_to_speech(answer))
            print(f"助手: {answer}")
            return jsonify({'response': answer, 'responsePic': ''})

        # 客服问题
        user_input = data_json.get('message', '')
        messages1 = (
            f"你是一个专业的客服助手。你的任务是根据用户的问题，从以下标准问题列表中找出最匹配的一个，并只返回该标准问题的完整编号（如：Q001）。"
            f"如果找不到明显匹配的，请返回“未找到”。\n"
            f"标准问题列表：{question_list}\n"
            f"用户问题：{user_input}\n"
            f"请只返回最匹配的标准问题编号（如：Q001），或者“未找到”。"
        )
        try:
            result = knowledge_base.llm.complete(messages1)
            answer = result.text
        except Exception as e:
            answer = f"调用大模型出错: {e}"
        if answer.startswith("Q"):
            answerPic = answer + ".png"
            answer = FAQ.get(answer)
            asyncio.run(async_text_to_speech(answer))
            print(f"助手: {answer}， 图片: {answerPic}")
            return jsonify({'response': answer, 'responsePic': answerPic})

        # RAG相关
        history = data_json.get('history', [])
        # 限制history长度，避免token超限
        max_history = 15
        if len(history) > max_history:
            history = history[-max_history:]
        # 构造完整messages
        messages2 = [{
            "role": "system",
            "content": (
                "作为专业的建筑客服与知识助手，我将基于中国建筑规范（GB系列优先）提供建筑设计、施工、材料、法规等领域的准确解答，"
                "并以清晰、友好的方式解释复杂概念。我严格区分信息参考与专业意见，绝不提供工程设计或法律建议。"
                "对于涉及安全（结构、消防、电气等）或关键规范的问题，我会明确引用依据、强调风险，并强烈建议您咨询注册专业人士进行现场评估。"
                "我的核心目标是安全、专业、负责地解答您的疑问，同时管理好服务边界，内容尽可能精炼。"
            )
        }]
        messages2.extend(history)
        # 拼接成字符串
        query_str = ""
        for msg in messages2:
            if msg["role"] == "system":
                query_str += f"系统：{msg['content']}\n"
            elif msg["role"] == "user":
                query_str += f"用户：{msg['content']}\n"
            elif msg["role"] == "assistant":
                query_str += f"助手：{msg['content']}\n"
        try:
            result = knowledge_base.query(query_str)
            answer = result.get('response', '')
        except Exception as e:
            answer = f"调用大模型出错: {e}"
        asyncio.run(async_text_to_speech(answer))
        print(f"助手: {answer}")
        return jsonify({'response': answer, 'responsePic': ''})
    else:
        # GET 请求返回首页
        return render_template('index.html')

@app.route('/rag', methods=['GET', 'POST'])
def rag():
    if request.method == 'POST':
        if 'pdf' in request.files:
            print("Processing file upload ***********************")
            files = request.files.getlist('pdf')
            for file in files:
                if file.filename:
                    save_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)           
                    try:
                        file.save(save_path)
                        knowledge_base.add_pdf_document(save_path)
                    except Exception as e:
                        return jsonify({
                            'status': status,
                            'message': '文件{file.filename}保存或添加失败: {e}'
                        })
            # flash('文件上传成功！')
            print("Finished file upload ***********************")
            # 获取更新后的状态
            status = knowledge_base.get_status()
            return jsonify({
                'status': status,
                'message': '文件上传成功！'
            })
    else:
        # 这里加上 GET 请求的返回
        status = knowledge_base.get_status()
        return render_template('rag.html', status=status)

@app.route('/clear', methods=['POST'])
def clear_knowledge_base():
    # 1. 清空知识库
    knowledge_base.clear_knowledge_base()
    status = knowledge_base.get_status()
    # 2. 清空 uploads 文件夹
    if os.path.exists(UPLOAD_FOLDER):
        try:
            for filename in os.listdir(UPLOAD_FOLDER):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                os.remove(file_path)
        except Exception as e:
            return jsonify({
                'status': status,
                'message': f"删除文件失败, 错误: {e}"
            })
    # flash('知识库已清空！')
    status = knowledge_base.get_status()
    return jsonify({
        'status': status,
        'message': '知识库已清空！'
    })

@app.route('/search', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        data_json = request.get_json()
        history = data_json.get('history', [])
        # 拼接历史消息内容
        messages = '\n'.join(turn.get('content', '') for turn in history)
        messages3 = (
            "你是一名建筑项目顾问，需要根据项目描述精准匹配设计师。请分析以下项目描述内容，从总标签库中提取最相关的5-8个关键词，要求：\n"
            "1. 只输出关键词，使用英文逗号分隔，例如：装配式建筑,在地材料,藏地文化空间,乡村更新。不需要解释。\n"
            "2. 最多8个关键词，按相关性从高到低排序。\n"
            "3. 关键词必须严格来自总标签库。\n\n"
            f"项目描述：{messages}\n"
            f"总标签库：{all_tags}\n"
        )
        try:
            result = knowledge_base.llm.complete(messages3)
            keywords = [kw.strip() for kw in result.text.split(',') if kw.strip()]
            top_architects = select_top_architects(keywords, architect_tags)
        except Exception as e:
            keywords = []
            top_architects = []
            print(f"调用大模型出错: {e}")
        print('keywords:', keywords, 'architects:', top_architects)
        return jsonify({'keywords': keywords, 'architects': top_architects})
        
async def async_text_to_speech(text):
    """异步生成语音文件"""
    voice = "zh-CN-YunxiNeural"  # 中文语音
    audio_path = os.path.join(app.static_folder, 'audio')
    os.makedirs(audio_path, exist_ok=True)  # 确保音频目录存在
    output_file = os.path.join(audio_path, "output.mp3")

    # 删除旧文件（如果存在）
    try:
        if os.path.exists(output_file):
            os.remove(output_file)
    except Exception as e:
        print(f"删除旧音频文件失败: {e}")

    # 生成新的语音文件
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    return "/static/audio/output.mp3"  # 返回可访问的URL路径

def select_top_architects(query_tags, architects_data):
    results = []
    for architect in architects_data:
        tags_set = set(architect.get('tags', []))
        common_tags = tags_set & set(query_tags)
        score = len(common_tags)
        union_size = len(tags_set | set(query_tags))
        jaccard_sim = score / union_size if union_size > 0 else 0

        results.append({
            'name': architect.get('name', ''),
            'score': score,
            'jaccard': jaccard_sim,
            'common_tags': list(common_tags)
        })
    # 按分数和Jaccard相似度降序排列，返回前三名建筑师名字
    sorted_results = sorted(results, key=lambda x: (-x['score'], -x['jaccard']))
    return [item['name'] for item in sorted_results[:3]]


if __name__ == '__main__':
    app.run(host=Config.APP_HOST, port=Config.APP_PORT, debug=True)