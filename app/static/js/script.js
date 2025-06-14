// =======================
// index页面专用
// =======================
const welcomeMessage = "你好，我是筑园助手，有什么可以为您服务😊";
let chatHistory = JSON.parse(sessionStorage.getItem('chatHistory') ?? JSON.stringify([{ role: 'assistant', content: welcomeMessage }]));
// 发送消息到后端并渲染到聊天窗口
function sendMessage() {
    const inputElement = document.getElementById('chat-input');
    const message = inputElement.value;
    if (!message.trim()) return;
    displayMessage('user', message);
    chatHistory.push({ role: 'user', content: message });
    inputElement.value = '加载中...';
    let imageName = ''; 
    if (currentImageName) {
        imageName = currentImageName; 
        displayMessage('user', imageName);
        chatHistory.push({ role: 'user', content: imageName });
        removePreview();
    }
    fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: message, 
            history: chatHistory,
            image: imageName
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('后端返回：', data);
        displayMessage('assistant', data.response);
        chatHistory.push({ role: 'assistant', content: data.response });
        if (data.responsePic!== '') {
            displayMessage('assistant', data.responsePic);
            chatHistory.push({ role: 'assistant', content: data.responsePic });
        }
        sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        inputElement.value = '';
        // 发送后清除图片
    })
    .catch(error => {
        inputElement.value = '';
        displayMessage('assistant', '出错了，请稍后再试。');
        console.error('Error:', error);
    });
}

// 渲染一条聊天消息到页面
function displayMessage(role, message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}`;
    const avatar = document.createElement('img');
    avatar.src = role === 'user' ? '/static/img/user-avatar.png' : '/static/img/bot-avatar.png';
    avatar.alt = role === 'user' ? 'User' : 'Assistant';
    const messageContent = document.createElement('div');
    
    messageContent.className = 'message-content';
    
    // 检查是否是用户发送的图片消息
    if (message.toLowerCase().endsWith('.jpg') || message.toLowerCase().endsWith('.png')) {
        const picContent = document.createElement('div');
        picContent.className = 'pic-content';
        picContent.style.display = 'flex';
        picContent.style.justifyContent = 'center';
        picContent.style.alignItems = 'center';
        picContent.style.width = '100%';

        const img = document.createElement('img');
        img.src = `/static/img/${message}`;
        img.alt = message;
        img.style.width = '300px';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
        img.style.margin = 'auto';  // 自动外边距确保居中

        picContent.appendChild(img);
        messageContent.appendChild(picContent);
    } else {
        messageContent.innerHTML = role === 'user' ? message : formatMessage(message);
    }
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

// 格式化机器人回复内容（如加粗、分段等）
function formatMessage(text) {
    if (!text) return '';
    let lines = text.split('\n');
    let formattedLines = lines.map(line => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
        return line;
    });
    let processedText = formattedLines.join('\n');
    let sections = processedText
        .split('###')
        .filter(section => section.trim())
        .map(section => {
            let lines = section.split('\n').filter(line => line.trim());
            if (lines.length === 0) return '';
            let result = '';
            let currentIndex = 0;
            while (currentIndex < lines.length) {
                let line = lines[currentIndex].trim();
                if (/^\d+\./.test(line)) {
                    result += `<p class="section-title">${line}</p>`;
                } else if (line.startsWith('-')) {
                    result += `<p class="subsection"><span class="bold-text">${line.replace(/^-/, '').trim()}</span></p>`;
                } else if (line.includes(':')) {
                    let [subtitle, content] = line.split(':').map(part => part.trim());
                    result += `<p><span class="subtitle">${subtitle}</span>: ${content}</p>`;
                } else {
                    result += `<p>${line}</p>`;
                }
                currentIndex++;
            }
            return result;
        });
    return sections.join('');
}

// 页面加载时渲染历史聊天记录
document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    document.getElementById('messages').innerHTML = '';
    chatHistory.forEach(msg => displayMessage(msg.role, msg.content));
});

// 清空聊天记录
function clearChat() {
    chatHistory = [{ role: 'assistant', content: welcomeMessage }];
    sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    document.getElementById('messages').innerHTML = '';
    chatHistory.forEach(msg => displayMessage(msg.role, msg.content));
}

// 建筑师筛选功能，向后端请求并自定义渲染推荐建筑师
function searchArchitect() {
    fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            history: chatHistory,
        })
    })
    .then(res => res.json())
    .then(data => {
        displayMessage('assistant', '根据您的描述，我们推荐以下建筑师😊：');
        // 自定义渲染：三个圆+两排关键词，不用displayMessage，不加robot头像
        const messagesContainer = document.getElementById('messages');
        const customBox = document.createElement('div');
        customBox.className = 'architects-keywords-box';
        // 建筑师三圆（中间最大最深，左二右三都小且淡，字号随圆大小变化）
        const circles = document.createElement('div');
        circles.className = 'architects-circles-custom';
        // 左侧第二名
        if (data.architects && data.architects[1]) {
            const circle2 = document.createElement('div');
            circle2.className = 'architect-circle-middle architect-circle-left';
            circle2.textContent = data.architects[1];
            circles.appendChild(circle2);
        }
        // 中间第一名
        if (data.architects && data.architects[0]) {
            const circle1 = document.createElement('div');
            circle1.className = 'architect-circle-large architect-circle-center';
            circle1.textContent = data.architects[0];
            circles.appendChild(circle1);
        }
        // 右侧第三名
        if (data.architects && data.architects[2]) {
            const circle3 = document.createElement('div');
            circle3.className = 'architect-circle-small architect-circle-right';
            circle3.textContent = data.architects[2];
            circles.appendChild(circle3);
        }
        customBox.appendChild(circles);
        // 关键词两排
        if (data.keywords && data.keywords.length > 0) {
            const keywordsRows = document.createElement('div');
            keywordsRows.className = 'keywords-rows';
            const half = Math.ceil(data.keywords.length / 2);
            const row1 = data.keywords.slice(0, half);
            const row2 = data.keywords.slice(half);
            const rowDiv1 = document.createElement('div');
            rowDiv1.className = 'keywords-row';
            row1.forEach(k => {
                const span = document.createElement('span');
                span.className = 'keyword-item';
                span.textContent = k;
                rowDiv1.appendChild(span);
            });
            const rowDiv2 = document.createElement('div');
            rowDiv2.className = 'keywords-row';
            row2.forEach(k => {
                const span = document.createElement('span');
                span.className = 'keyword-item';
                span.textContent = k;
                rowDiv2.appendChild(span);
            });
            keywordsRows.appendChild(rowDiv1);
            keywordsRows.appendChild(rowDiv2);
            customBox.appendChild(keywordsRows);
        }
        messagesContainer.appendChild(customBox);
        customBox.scrollIntoView({ behavior: 'smooth' });
    })
    .catch(error => {
        console.error('Error:', error);
        alert('筛选建筑师失败，请稍后再试。');
    });
}

// 播放/暂停最新语音消息
let currentAudio = null;
function playLatestAudio() {
    const audioBtn = document.querySelector('button[onclick="playLatestAudio()"]');
    if (audioBtn.textContent === "播放语音") {
        if (!currentAudio) {
            console.log("创建新的音频实例");
            currentAudio = new Audio('static/audio/output.mp3');  
            currentAudio.addEventListener('ended', function() {
                console.log("播放结束");
                audioBtn.textContent = "播放语音";
                currentAudio = null;
            });
        }
        console.log("尝试播放音频");
        currentAudio.play().then(() => {
            console.log("开始播放");
            audioBtn.textContent = "暂停语音";
        }).catch(function(error) {
            console.error("播放失败:", error);
            alert("暂无语音或播放失败");
            audioBtn.textContent = "播放语音";
            currentAudio = null;
        });
    }
    else if (audioBtn.textContent === "暂停语音") {
        if (currentAudio) {
            console.log("暂停播放");
            currentAudio.pause();
            audioBtn.textContent = "播放语音";
        }
    }
}

// 图片上传框
let currentImageName = ''; // 添加全局变量存储当前图片名
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('upload-area');
    const uploadClick = document.getElementById('upload-click');

    if (uploadArea && uploadClick) {
        // 点击上传区域触发文件选择
        uploadArea.addEventListener('click', function(e) {
            // 如果点击的是删除按钮，不触发文件选择
            if (e.target.closest('.delete-btn')) return;
            uploadClick.click();
        });
        uploadClick.addEventListener('change', handleFiles);

        // 拖拽相关事件
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles({ target: { files: files } });
        });
    }
});

// 处理文件选择和拖拽上传
function handleFiles(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        // alert('请选择图片文件');
        uploadClick.value = '';
        currentImageName = '';
        return;
    }
    currentImageName = file.name;
    imagePreview(file);
}

// 加入图片预览
function imagePreview(file) {
    const previewContainer = document.getElementById('picture-preview');
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadIcon = document.querySelector('.upload-icon');
        if (uploadIcon) uploadIcon.style.display = 'none';

        previewContainer.style.display = 'flex';
        previewContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%;">
                <img src="${e.target.result}" alt="预览图片">
                <button onclick="removePreview(event)" class="delete-btn">×</button>
            </div>`;
    };
    reader.readAsDataURL(file);
}

// 移除图片预览
function removePreview(event) {
    // 如果提供了事件对象，则阻止默认行为
    if (event) {
        event.preventDefault();
    }
    const previewContainer = document.getElementById('picture-preview');
    const uploadClick = document.getElementById('upload-click');
    const uploadIcon = document.querySelector('.upload-icon');
    
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
    uploadClick.value = '';
    currentImageName = ''; // 清除图片名
    if (uploadIcon) uploadIcon.style.display = 'block';
}




// =======================
// RAG 页面专用
// =======================
// 页面加载时加载已上传文件
let selectedFiles = [];
document.addEventListener('DOMContentLoaded', function() {
    const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    if (savedFiles.length > 0) {
        showUploadedFiles(savedFiles);
    }
});

// 文件上传框
document.addEventListener('DOMContentLoaded', function() {
    const uploadPDFArea = document.getElementById('uploadPDF-area');
    const uploadPDFClick = document.getElementById('uploadPDF-click');
    
    window.addEventListener('load', ragLoadUploadedFiles);

    if (uploadPDFArea && uploadPDFClick) {

        // 点击上传区域触发文件选择
        uploadPDFArea.addEventListener('click', function(e) {
            uploadPDFClick.click();
        });
        uploadPDFClick.addEventListener('change', function(e) {
            const files = Array.from(uploadPDFClick.files).filter(f => f.type === "application/pdf");
            handlePDFFiles(files);
        });

        // 拖拽相关事件
        uploadPDFArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        uploadPDFArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        uploadPDFArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
            handlePDFFiles(files);
        });
    }
    // 从localStorage加载已上传文件
    function ragLoadUploadedFiles() {
        
    }
});

// 处理文件选择和拖拽上传
function handlePDFFiles(files) {
    const uploadPDFText = document.getElementById('uploadPDF-text');
    const uploadedFiles = document.getElementById('uploaded-files');
    if (files.length > 0) {
        const existingNames = [
            ...selectedFiles.map(f => f.name),
            ...Array.from(uploadedFiles.children).map(div => div.textContent)
        ];
        files.forEach(f => {
            if (!existingNames.includes(f.name)) selectedFiles.push(f);
        });
        if (selectedFiles.length > 0) {
            let fileListHtml = '';
            selectedFiles.forEach(file => {fileListHtml += `${file.name}<br>`;});
            uploadPDFText.innerHTML = fileListHtml;
        } else {
            uploadPDFText.innerHTML = '将文件拖放到此处<br><b>-或-</b><br>点击上传';
        }
    }       
}

// 上传表单
function fileUpload() {
    if (selectedFiles.length === 0) return;
    const formData = new FormData();
    selectedFiles.forEach(file => {formData.append('pdf', file);});
    const loadingElement = document.getElementById('upload-loading');
    if (loadingElement) loadingElement.style.display = 'block';
    fetch('/rag', {
        method: 'POST',
        body: formData
    }).then(response => response.json()).then(data => {
        document.getElementById('flash-message').textContent = data.message;
        document.getElementById('doc-count').textContent = data.status.document_count;
        document.getElementById('table-name').textContent = data.status.table_name;
        document.getElementById('embedding-model').textContent = data.status.embedding_model;
        document.getElementById('embedding-dim').textContent = data.status.embedding_dim;
        document.getElementById('llm-model').textContent = data.status.llm_model;
        const uploadPDFText = document.getElementById('uploadPDF-text');
        uploadPDFText.innerHTML = '将文件拖放到此处<br><b>-或-</b><br>点击上传';
        if (loadingElement) loadingElement.style.display = 'none';
        showUploadedFiles(selectedFiles.map(f => f.name));
        selectedFiles = [];
    }).catch(error => {
        console.error('上传失败:', error);
    });
}

// 清空知识库
function clearUpload() {
    const uploadPDFText = document.getElementById('uploadPDF-text');
    uploadPDFText.innerHTML = '将文件拖放到此处<br><b>-或-</b><br>点击上传';
    selectedFiles = [];
    fetch('/clear', {
        method: 'POST'
    }).then(response => response.json()).then(data => {
        document.getElementById('flash-message').textContent = data.message;
        document.getElementById('doc-count').textContent = data.status.document_count;
        document.getElementById('table-name').textContent = data.status.table_name;
        document.getElementById('embedding-model').textContent = data.status.embedding_model;
        document.getElementById('embedding-dim').textContent = data.status.embedding_dim;
        document.getElementById('llm-model').textContent = data.status.llm_model;
        const uploadedFiles = document.getElementById('uploaded-files');
        uploadedFiles.innerHTML = '';
        uploadedFiles.style.display = 'none';
        localStorage.removeItem('uploadedFiles');
    }).catch(error => {
        console.error('上传失败:', error);
    });
}

// 展示已上传文件
function showUploadedFiles(names) {
    const uploadedFiles = document.getElementById('uploaded-files');
    names.forEach(name => {
        const div = document.createElement('div');
        div.textContent = name;
        uploadedFiles.appendChild(div);
    });
    uploadedFiles.style.display = 'block';
    localStorage.setItem('uploadedFiles', JSON.stringify(Array.from(uploadedFiles.children).map(div => div.textContent))); // 保存到 localStorage
}




// =======================
// 标签栏及主题切换专用
// =======================

// 主题应用函数，确保每次页面加载和切换都能正确应用主题
function applyTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const body = document.body;
    const btn = document.getElementById('theme-toggle-btn');
    if (isDarkMode) {
        body.classList.add('dark-mode');
        if (btn) btn.textContent = '浅色';
    } else {
        body.classList.remove('dark-mode');
        if (btn) btn.textContent = '深色';
    }
}

// 切换深浅色主题并保存到 localStorage
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', (!isDark).toString());
    applyTheme();
}

// 页面加载时自动应用主题
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    // 回车发送消息
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
});
// =======================
// END
// =======================
