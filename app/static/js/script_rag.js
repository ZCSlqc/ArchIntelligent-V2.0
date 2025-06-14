// =======================
// RAG 页面专用
// =======================
// 页面加载时加载已上传文
// 页面加载时渲染历史聊天记录

let selectedFiles = [];
document.addEventListener('DOMContentLoaded', function() {
    const uploadPDFArea = document.getElementById('drop-area');
    const uploadPDFClick = document.getElementById('drop-area-click');


    if (uploadPDFArea && uploadPDFClick) {

        // 点击上传区域触发文件选择
        uploadPDFArea.addEventListener('click', function(e) {
            uploadPDFClick.click();
        });
        uploadPDFClick.addEventListener('change', function(e) {
            handleFiles(Array.from(this.files));
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
            handleFiles(Array.from(this.files));
        });
    }
});
// 处理文件选择和拖拽上传
function handlePDFSelect(files) {
    const uploadPDFText = document.getElementById('drop-area-text');
    const uploadedFiles = document.getElementById('uploaded-files');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (files.length === 0) return;
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
        const uploadPDFText = document.getElementById('drop-area-text');
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
    const uploadPDFText = document.getElementById('drop-area-text');
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
