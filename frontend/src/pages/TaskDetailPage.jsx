import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Terminal, Database, CheckSquare, RotateCcw } from 'lucide-react'

const statusConfig = {
  created: { label: '已创建', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  queued: { label: '排队中', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  running: { label: '运行中', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  succeeded: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: '失败', color: 'text-red-400', bg: 'bg-red-500/10' },
  timeout: { label: '超时', color: 'text-red-400', bg: 'bg-red-500/10' },
  cancelled: { label: '已取消', color: 'text-slate-400', bg: 'bg-slate-500/10' },
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const [task, setTask] = useState(null)
  const [events, setEvents] = useState([])
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [pid, setPid] = useState(null)
  const eventSourceRef = useRef(null)
  const stepsRef = useRef(null)

  useEffect(() => {
    loadTask()
    return () => { if (eventSourceRef.current) eventSourceRef.current.close() }
  }, [taskId])

  async function loadTask() {
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (!res.ok) throw new Error('任务不存在')
      const data = await res.json()
      setTask(data)
      setStatus(data.status)

      if (data.status === 'created') {
        // 首次连接：清空事件，通过 SSE 接收
        startStreaming(0)
      } else if (data.status === 'running') {
        // 重连观察：不清空已有事件，通过 SSE 带 after 参数获取历史+新事件
        startStreaming(0)
      } else {
        // 终态：直接通过 REST 加载
        loadExistingEvents()
        loadResult()
      }
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function loadExistingEvents() {
    fetch(`/api/tasks/${taskId}/events`)
      .then(r => r.json())
      .then(evts => setEvents(evts))
      .catch(() => {})
  }

  function loadResult() {
    fetch(`/api/tasks/${taskId}/result`)
      .then(r => r.json())
      .then(data => { if (data.result) setResult(data.result) })
      .catch(() => {})
  }

  function startStreaming(after = 0) {
    if (status !== 'created') {
      // running 重连：不清空事件，直接追加
    } else {
      setEvents([])
    }

    const url = `/api/tasks/${taskId}/stream${after > 0 ? `?after=${after}` : ''}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setEvents(prev => [...prev, data])
        if (data.event_type === 'task_started') setStatus('running')
        if (data.event_type === 'cli_started' && data.pid) setPid(data.pid)
        setTimeout(() => { stepsRef.current?.scrollTo(0, stepsRef.current.scrollHeight) }, 50)
      } catch {}
    }

    es.addEventListener('done', (e) => {
      try {
        const data = JSON.parse(e.data)
        setStatus(data.status)
      } catch {}
      es.close()
      eventSourceRef.current = null
      loadResult()
    })

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      // 重连：携带当前事件数量作为 after 参数
      setTimeout(() => {
        setEvents(prev => {
          startStreaming(prev.length)
          return prev
        })
      }, 5000)
    }
  }

  async function cancelTask() {
    if (!window.confirm('确认中止任务？此操作不可撤销。')) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '中止失败')
      }
      setStatus('cancelled')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    } catch (e) {
      alert(e.message)
    } finally {
      setCancelling(false)
    }
  }

  async function retryTask() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '重试失败')
      }
      // 重置状态，清空事件和结果，重新开始
      setEvents([])
      setResult(null)
      setPid(null)
      setStatus('created')
      startStreaming(0)
    } catch (e) {
      alert(e.message)
    } finally {
      setRetrying(false)
    }
  }

  function formatEventType(type) {
    const map = {
      task_created: '任务创建', task_started: '开始分析',
      task_completed: '分析完成', task_failed: '分析失败',
      task_timeout: '执行超时', task_cancelled: '任务中止',
      task_retried: '任务重试',
      cli_started: 'CLI 启动',
      cli_output: '分析输出',
      cli_error: 'CLI 错误', cli_timeout: 'CLI 超时',
    }
    return map[type] || type
  }

  if (status === 'loading') return <div className="text-center text-slate-500 py-20">加载中...</div>
  if (status === 'error') return <div className="text-center text-red-400 py-20">{error}</div>

  const sc = statusConfig[status] || statusConfig.created
  const isKnowledgeBuild = task?.task_type === 'knowledge_building'
  const taskLabel = isKnowledgeBuild
    ? `知识库构建: ${task?.input?.module_name || '未知模块'}`
    : taskId

  return (
    <div className="space-y-6">
      {/* 任务信息栏 */}
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className={`text-sm ${isKnowledgeBuild ? 'text-teal-300 font-medium' : 'font-mono text-slate-400'}`}>
          {isKnowledgeBuild && <Database className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
          {taskLabel}
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
          {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
          {sc.label}
        </span>
        {status === 'running' && (
          <button
            onClick={cancelTask}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            {cancelling ? '中止中...' : '中止任务'}
          </button>
        )}
        {status === 'running' && pid && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700">
            PID: {pid}
          </span>
        )}
        {['succeeded', 'failed', 'timeout', 'cancelled'].includes(status) && (
          <button
            onClick={retryTask}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {retrying ? '重试中...' : '重试'}
          </button>
        )}
        {isKnowledgeBuild && status === 'succeeded' && (
          <Link
            to="/knowledge"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            前往知识库确认
          </Link>
        )}
      </div>

      {/* 分析过程 - 终端风格 */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/50">
          {isKnowledgeBuild ? <Database className="w-4 h-4 text-teal-400" /> : <Terminal className="w-4 h-4 text-cyan-400" />}
          <span className="text-sm font-medium text-slate-300">{isKnowledgeBuild ? '构建过程' : '分析过程'}</span>
          {status === 'running' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" /> 分析中...
            </span>
          )}
        </div>
        <div ref={stepsRef} className="max-h-[400px] overflow-y-auto p-4 space-y-1 bg-slate-950/50">
          {events.length === 0 && status === 'created' ? (
            <p className="text-slate-600 text-sm">等待分析开始...</p>
          ) : events.length === 0 ? (
            <p className="text-slate-600 text-sm">暂无分析记录</p>
          ) : events.map((evt, i) => {
            const isErr = ['task_failed', 'cli_error', 'cli_timeout', 'task_timeout'].includes(evt.event_type)
            const isCancel = evt.event_type === 'task_cancelled'
            return (
              <div key={i} className={`terminal-line animate-slide-in ${isErr ? 'text-red-400' : isCancel ? 'text-amber-400' : 'text-slate-400'}`}>
                {evt.timestamp && (
                  <span className="text-slate-600 mr-2">{new Date(evt.timestamp).toLocaleTimeString('zh-CN')}</span>
                )}
                {evt.event_type === 'cli_output' ? (
                  <span className="text-teal-300">{evt.content || evt.message || ''}</span>
                ) : (
                  <span>
                    <span className={`${
                      evt.event_type === 'task_cancelled' ? 'text-amber-400' :
                      evt.event_type === 'task_completed' ? 'text-emerald-400' :
                      'text-cyan-400'
                    }`}>[{formatEventType(evt.event_type)}]</span>
                    {' '}{evt.message || ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 诊断结果 */}
      {result && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
          <h2 className="text-base font-semibold text-slate-200">{isKnowledgeBuild ? '构建结果' : '诊断结果'}</h2>

          {/* 摘要 */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
            <p className="text-sm text-cyan-200">{result.summary || '分析完成'}</p>
          </div>

          {/* 根因候选 */}
          {result.root_cause_candidates?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">根因候选</h3>
              <div className="space-y-3">
                {result.root_cause_candidates.map(c => (
                  <div key={c.rank} className="border border-slate-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-white text-xs font-bold shrink-0">
                        {c.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium">{c.description}</p>
                        {c.evidence?.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {c.evidence.map((e, i) => (
                              <li key={i} className="text-xs text-slate-400 pl-1">• {e}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 修复建议 */}
          {result.fix_suggestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">修复建议</h3>
              <div className="space-y-4">
                {result.fix_suggestions.map(f => (
                  <div key={f.for_candidate}>
                    <p className="text-xs text-slate-500 mb-2">针对候选 #{f.for_candidate}</p>
                    <div className="space-y-1">
                      {f.steps?.map((s, i) => (
                        <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded px-3 py-2 text-sm text-slate-300">
                          {i + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 原始输出（fallback） */}
          {!result.root_cause_candidates?.length && result.raw_output && (
            <div className="border border-slate-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-xs text-slate-400 whitespace-pre-wrap">{result.raw_output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
