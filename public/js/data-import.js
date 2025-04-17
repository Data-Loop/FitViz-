// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 加载已导入的年份数据
        await loadImportedYears();
        
        // 加载日志
        await loadLogs();
        
        // 绑定导入按钮事件
        document.getElementById('import-button').addEventListener('click', handleImport);
        
        // 绑定Excel文件选择事件（用于预览）
        document.getElementById('excel-file').addEventListener('change', previewExcelFile);
    } catch (error) {
        console.error('页面初始化失败:', error);
        alert('页面初始化失败: ' + error.message);
    }
});

// 加载已导入的年份数据
async function loadImportedYears() {
    try {
        const years = await fetchAPI('/years');
        const yearsContainer = document.getElementById('years-container');
        
        if (!yearsContainer) return;
        
        yearsContainer.innerHTML = '';
        
        if (years.length === 0) {
            yearsContainer.innerHTML = '<p>暂无导入数据</p>';
            return;
        }
        
        years.forEach(year => {
            const yearTag = document.createElement('div');
            yearTag.className = 'year-tag';
            yearTag.innerHTML = `
                <span>${year}年</span>
                <span class="delete-year" data-year="${year}">×</span>
            `;
            yearsContainer.appendChild(yearTag);
        });
        
        // 绑定删除年份事件
        const deleteButtons = document.querySelectorAll('.delete-year');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const year = this.getAttribute('data-year');
                if (confirm(`确定要删除 ${year} 年的数据吗？此操作不可恢复。`)) {
                    deleteYearData(year);
                }
            });
        });
    } catch (error) {
        console.error('加载已导入年份失败:', error);
        alert('加载已导入年份失败: ' + error.message);
    }
}

// 加载日志
async function loadLogs() {
    try {
        const logs = await fetchAPI('/logs');
        const logContainer = document.getElementById('log-container');
        
        if (!logContainer) return;
        
        logContainer.innerHTML = '';
        
        if (logs.length === 0) {
            logContainer.innerHTML = '<p>暂无日志记录</p>';
            return;
        }
        
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            // 格式化时间
            const timestamp = new Date(log.timestamp);
            const formattedTime = timestamp.toLocaleString();
            
            logEntry.innerHTML = `
                <span class="log-time">${formattedTime}</span>
                <span class="log-action">${log.action}:</span>
                <span class="log-desc">${log.description}</span>
            `;
            
            logContainer.appendChild(logEntry);
        });
    } catch (error) {
        console.error('加载日志失败:', error);
        alert('加载日志失败: ' + error.message);
    }
}

// 处理导入
async function handleImport() {
    try {
        const yearInput = document.getElementById('import-year');
        const fileInput = document.getElementById('excel-file');
        const importStatus = document.getElementById('import-status');
        
        // 验证输入
        if (!yearInput.value) {
            importStatus.textContent = '请输入年份';
            importStatus.className = 'status-message error';
            return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
            importStatus.textContent = '请选择Excel文件';
            importStatus.className = 'status-message error';
            return;
        }
        
        const year = yearInput.value;
        const file = fileInput.files[0];
        
        // 确认是否覆盖已有数据
        const years = await fetchAPI('/years');
        if (years.includes(parseInt(year))) {
            if (!confirm(`${year}年的数据已存在，是否覆盖？`)) {
                return;
            }
        }
        
        // 显示导入中状态
        importStatus.textContent = '正在导入数据，请稍候...';
        importStatus.className = 'status-message';
        importStatus.style.display = 'block';
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('year', year);
        formData.append('file', file);
        
        // 发送请求
        const response = await fetch(`${API_BASE_URL}/import`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '导入失败');
        }
        
        const data = await response.json();
        
        // 显示成功状态
        importStatus.textContent = data.message;
        importStatus.className = 'status-message success';
        
        // 重新加载年份和日志
        await loadImportedYears();
        await loadLogs();
        
        // 清空输入
        yearInput.value = '';
        fileInput.value = '';
        document.getElementById('data-preview').innerHTML = '';
    } catch (error) {
        console.error('导入数据失败:', error);
        const importStatus = document.getElementById('import-status');
        importStatus.textContent = '导入失败: ' + error.message;
        importStatus.className = 'status-message error';
    }
}

// 预览Excel文件
function previewExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 获取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 显示预览
            renderPreview(jsonData);
        } catch (error) {
            console.error('预览Excel文件失败:', error);
            alert('预览Excel文件失败: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 渲染预览表格
function renderPreview(data) {
    if (!data || data.length === 0) return;
    
    const tableContainer = document.getElementById('data-preview');
    tableContainer.innerHTML = '';
    
    const table = document.createElement('table');
    table.id = 'preview-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 假设第一行是表头
    const headers = data[0];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header || '';
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    // 只显示前10行数据
    const rowsToShow = Math.min(data.length - 1, 10);
    for (let i = 1; i <= rowsToShow; i++) {
        const tr = document.createElement('tr');
        const rowData = data[i];
        
        rowData.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell !== null && cell !== undefined ? cell : '';
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // 如果数据超过10行，显示提示
    if (data.length > 11) {
        const message = document.createElement('p');
        message.className = 'preview-message';
        message.textContent = `只显示前10行，共${data.length - 1}行数据`;
        tableContainer.appendChild(message);
    }
}

// 删除年份数据
async function deleteYearData(year) {
    try {
        const response = await fetch(`${API_BASE_URL}/data/${year}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除失败');
        }
        
        // 重新加载年份和日志
        await loadImportedYears();
        await loadLogs();
        
        alert(`已成功删除${year}年数据`);
    } catch (error) {
        console.error('删除数据失败:', error);
        alert('删除数据失败: ' + error.message);
    }
} 