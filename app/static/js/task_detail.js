(function() {
    var taskId = window.TASK_ID;
    var stepsContainer = document.getElementById('analysis-steps');
    var resultPanel = document.getElementById('result-panel');
    var resultSummary = document.getElementById('result-summary');
    var resultCandidates = document.getElementById('result-candidates');
    var resultFixes = document.getElementById('result-fixes');
    var statusEl = document.getElementById('display-status');
    var eventSource = null;

    // 先加载任务状态
    loadTaskInfo();

    function loadTaskInfo() {
        fetch('/api/tasks/' + taskId)
            .then(function(resp) { return resp.json(); })
            .then(function(task) {
                updateStatus(task.status);
                // 如果任务还是 created 状态，触发分析
                if (task.status === 'created') {
                    startStreaming();
                } else if (task.status === 'running') {
                    // 正在运行，连接 SSE 继续接收
                    startStreaming();
                } else {
                    // 已完成，直接加载结果
                    loadEvents();
                    loadResult();
                }
            })
            .catch(function(err) {
                statusEl.textContent = '加载失败';
                statusEl.className = 'status-badge status-failed';
            });
    }

    function startStreaming() {
        // 清空步骤区域
        stepsContainer.innerHTML = '';

        eventSource = new EventSource('/api/tasks/' + taskId + '/stream');

        eventSource.onmessage = function(event) {
            try {
                var data = JSON.parse(event.data);
                addStep(data);
            } catch(e) {}
        };

        eventSource.addEventListener('done', function(event) {
            try {
                var data = JSON.parse(event.data);
                updateStatus(data.status);
            } catch(e) {}
            eventSource.close();
            loadResult();
        });

        eventSource.onerror = function() {
            eventSource.close();
            // 自动重连在 5 秒后
            setTimeout(function() {
                loadTaskInfo();
            }, 5000);
        };
    }

    function addStep(data) {
        var emptyHint = stepsContainer.querySelector('.empty-hint');
        if (emptyHint) emptyHint.remove();

        var card = document.createElement('div');
        var isError = data.event_type === 'task_failed' || data.event_type === 'cli_error' || data.event_type === 'cli_timeout';
        card.className = 'step-card' + (isError ? ' step-error' : '');

        var time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString('zh-CN') : '';
        var content = data.message || data.content || '';

        // 如果内容太长，截断显示
        var displayContent = content;
        if (displayContent.length > 1000) {
            displayContent = displayContent.substring(0, 1000) + '...';
        }

        card.innerHTML =
            '<div class="step-time">' + escapeHtml(time) + '</div>' +
            '<div class="step-type">' + escapeHtml(formatEventType(data.event_type)) + '</div>' +
            '<div class="step-content">' + escapeHtml(displayContent) + '</div>';

        stepsContainer.appendChild(card);
        stepsContainer.scrollTop = stepsContainer.scrollHeight;

        // 更新状态
        if (data.event_type === 'task_started') {
            updateStatus('running');
        } else if (data.event_type === 'task_completed') {
            updateStatus('succeeded');
        } else if (data.event_type === 'task_failed') {
            updateStatus('failed');
        } else if (data.event_type === 'task_timeout') {
            updateStatus('timeout');
        }
    }

    function loadEvents() {
        fetch('/api/tasks/' + taskId + '/events')
            .then(function(resp) { return resp.json(); })
            .then(function(events) {
                stepsContainer.innerHTML = '';
                events.forEach(function(e) { addStep(e); });
            });
    }

    function loadResult() {
        fetch('/api/tasks/' + taskId + '/result')
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
                if (data.result) {
                    renderResult(data.result);
                }
            });
    }

    function renderResult(result) {
        resultPanel.style.display = '';

        // 摘要
        resultSummary.textContent = result.summary || '分析完成';

        // 根因候选
        var candidates = result.root_cause_candidates || [];
        if (candidates.length) {
            resultCandidates.innerHTML = '<h3 style="margin-bottom:8px;font-size:14px">根因候选</h3>' +
                candidates.map(function(c) {
                    return '<div class="candidate-card">' +
                        '<span class="candidate-rank">' + c.rank + '</span>' +
                        '<strong>' + escapeHtml(c.description) + '</strong>' +
                        '<div class="candidate-evidence"><ul>' +
                        (c.evidence || []).map(function(e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') +
                        '</ul></div></div>';
                }).join('');
        }

        // 修复建议
        var fixes = result.fix_suggestions || [];
        if (fixes.length) {
            resultFixes.innerHTML = '<h3 style="margin-bottom:8px;font-size:14px">修复建议</h3>' +
                fixes.map(function(f) {
                    var steps = (f.steps || []).map(function(s, i) {
                        return '<div class="fix-step">' + (i+1) + '. ' + escapeHtml(s) + '</div>';
                    }).join('');
                    return '<div style="margin-bottom:12px">' +
                        '<div style="font-size:13px;color:#555;margin-bottom:4px">针对候选 #' + f.for_candidate + '</div>' +
                        steps + '</div>';
                }).join('');
        }

        // 如果没有结构化结果但有 raw_output
        if (!candidates.length && result.raw_output) {
            resultCandidates.innerHTML = '<div class="step-card"><div class="step-content">' +
                escapeHtml(result.raw_output) + '</div></div>';
        }
    }

    function updateStatus(status) {
        var map = {
            created: '已创建', queued: '排队中', running: '运行中',
            succeeded: '已完成', failed: '失败', timeout: '超时', cancelled: '已取消'
        };
        statusEl.textContent = map[status] || status;
        statusEl.className = 'status-badge status-' + status;
    }

    function formatEventType(type) {
        var map = {
            task_created: '任务创建',
            task_started: '开始分析',
            task_completed: '分析完成',
            task_failed: '分析失败',
            task_timeout: '执行超时',
            cli_output: '分析输出',
            cli_error: 'CLI 错误',
            cli_timeout: 'CLI 超时'
        };
        return map[type] || type;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
