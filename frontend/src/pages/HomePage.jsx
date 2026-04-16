import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Search, Database, FolderOpen, RotateCcw } from 'lucide-react'

const statusConfig = {
  created: { label: '已创建', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
  queued: { label: '排队中', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
  running: { label: '运行中', color: 'text-amber-400 bg-amber-500/10', icon: Loader2 },
  succeeded: { label: '已完成', color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
  failed: { label: '失败', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  timeout: { label: '超时', color: 'text-red-400 bg-red-500/10', icon: AlertTriangle },
  cancelled: { label: '已取消', color: 'text-slate-400 bg-slate-500/10', icon: XCircle },
}

export default function HomePage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    problem_description: '',
    log_content: '',
    code_snippet: '',
  })
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState('')
  const [building, setBuilding] = useState(false)

  useEffect(() => { loadTasks(); loadModules() }, [])

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks')
      setTasks(await res.json())
    } catch { /* network error, skip */ }
  }

  async function loadModules() {
    try {
      const res = await fetch('/api/tasks/modules/list')
      setModules(await res.json())
    } catch { /* network error, skip */ }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.problem_description && !form.log_content && !form.code_snippet) return
    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, task_type: 'problem_locating' }),
      })
      const task = await res.json()
      navigate(`/tasks/${task.task_id}`)
    } catch (err) {
      alert('提交失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuildKnowledge() {
    if (!selectedModule) return
    setBuilding(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'knowledge_building', module_name: selectedModule }),
      })
      const task = await res.json()
      navigate(`/tasks/${task.task_id}`)
    } catch (err) {
      alert('构建失败: ' + err.message)
    } finally {
      setBuilding(false)
    }
  }

  async function retryTask(e, taskId) {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '重试失败')
      }
      navigate(`/tasks/${taskId}`)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：提交表单 */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          提交问题
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">问题描述 *</label>
            <textarea
              value={form.problem_description}
              onChange={e => setForm(f => ({...f, problem_description: e.target.value}))}
              placeholder="描述你遇到的问题，例如：应用冻屏、崩溃、权限报错..."
              rows={3}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">故障日志</label>
            <textarea
              value={form.log_content}
              onChange={e => setForm(f => ({...f, log_content: e.target.value}))}
              placeholder="粘贴故障日志（hilog、HiviewDFX crash/freeze 等）..."
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">代码片段</label>
            <textarea
              value={form.code_snippet}
              onChange={e => setForm(f => ({...f, code_snippet: e.target.value}))}
              placeholder="粘贴相关代码片段（可选）..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-cyan-400 hover:to-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? '提交中...' : '提交分析'}
          </button>
        </form>

        {/* 知识库构建 */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            知识库构建
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">选择模块</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={selectedModule}
                  onChange={e => setSelectedModule(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 appearance-none"
                >
                  <option value="">-- 选择模块 --</option>
                  {modules.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleBuildKnowledge}
              disabled={building || !selectedModule}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-teal-400 hover:to-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {building ? '构建中...' : '开始构建'}
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：任务列表 */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4">任务列表</h2>
        {tasks.length === 0 ? (
          <div className="text-center text-slate-600 py-12">暂无任务</div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {tasks.map(task => {
              const sc = statusConfig[task.status] || statusConfig.created
              const Icon = sc.icon
              const desc = task.task_type === 'knowledge_building'
                ? `知识库构建: ${task.input?.module_name || '未知模块'}`
                : (task.input?.problem_description || task.task_type)
              return (
                <div
                  key={task.task_id}
                  onClick={() => navigate(`/tasks/${task.task_id}`)}
                  className="p-3 rounded-lg border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-500">{task.task_id}</span>
                    <div className="flex items-center gap-1.5">
                      {task.status === 'running' && task.pid && (
                        <span className="text-xs font-mono text-slate-500">PID: {task.pid}</span>
                      )}
                      {['succeeded', 'failed', 'timeout', 'cancelled'].includes(task.status) && (
                        <button
                          onClick={(e) => retryTask(e, task.task_id)}
                          className="p-1 rounded text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                          title="重试"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                        <Icon className={`w-3 h-3 ${task.status === 'running' ? 'animate-spin' : ''}`} />
                        {sc.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 truncate">{desc}</p>
                  <p className="text-xs text-slate-600 mt-1">{task.task_type} · {new Date(task.created_at).toLocaleString('zh-CN')}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
