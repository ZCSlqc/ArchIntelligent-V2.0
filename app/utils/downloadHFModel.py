import os
from transformers import AutoModel, AutoTokenizer

# 定义模型名称和目标路径
model_name = "BAAI/bge-small-zh-v1.5"  # Hugging Face 上的模型名称
target_path = r"D:\huggingface_models\BAAI\bge-small-zh-v1.5"  # 目标路径

# 确保目标路径存在
os.makedirs(target_path, exist_ok=True)

# 下载模型和分词器
print("开始下载模型...")
model = AutoModel.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# 保存模型和分词器到目标路径
print("保存模型到指定路径...")
model.save_pretrained(target_path)
tokenizer.save_pretrained(target_path)

print(f"模型已成功下载并保存到 {target_path}")