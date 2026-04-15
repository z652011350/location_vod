(function() {
    const form = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');

    // 提交任务
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '提交中...';

        const data = {
            problem_description: document.getElementById('problem_description').value,
            log_content: document.getElementById('log_content').value,
            code_snippet: document.getElementById('code_snippet').value,
            task_type: 'problem_locating',
        };

        try {
            const resp = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!resp.ok) {
                const err = await resp.json();
                alert('提交失败: ' + (err.detail || '未知错误'));
                return;
            }

            const task = await resp.json();
            // 跳转到详情页并触发 SSE
            window.location.href = '/app/tasks/' + task.task_id;
        } catch (err) {
            alert('网络错误: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '提交分析';
        }
    });

    // 加载任务列表
    async function loadTasks() {
        try {
            const resp = await fetch('/api/tasks');
            const tasks = await resp.json();

            if (!tasks.length) {
                taskList.innerHTML = '<p class="empty-hint">暂无任务</p>';
                return;
            }

            taskList.innerHTML = tasks.map(function(t) {
                var desc = (t.input && t.input.problem_description) || t.task_type;
                if (desc.length > 60) desc = desc.substring(0, 60) + '...';
                return '<div class="task-card" onclick="window.location.href=\'/app/tasks/' + t.task_id + '\'">' +
                    '<div class="task-card-header">' +
                        '<span class="task-card-id">' + t.task_id + '</span>' +
                        '<span class="status-badge status-' + t.status + '">' + statusText(t.status) + '</span>' +
                    '</div>' +
                    '<div class="task-card-desc">' + escapeHtml(desc) + '</div>' +
                    '<div class="task-card-type">' + t.task_type + ' · ' + formatTime(t.created_at) + '</div>' +
                '</div>';
            }).join('');
        } catch (err) {
            taskList.innerHTML = '<p class="empty-hint">加载失败</p>';
        }
    }

    function statusText(s) {
        var map = {
            created: '已创建', queued: '排队中', running: '运行中',
            succeeded: '已完成', failed: '失败', timeout: '超时', cancelled: '已取消'
        };
        return map[s] || s;
    }

    function formatTime(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    loadTasks();
})();
