import { useState, useEffect } from 'react'
import { BookOpen, CheckCircle, Edit3, Sparkles, RefreshCw, Loader2, Search, AlertCircle, FileText, FolderX } from 'lucide-react'
import FileContentViewer from '../components/FileContentViewer'

const statusBadge = {
  ai_native: { label: 'AI 原生', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Sparkles, animate: true },
  confirmed: { label: '已确认', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle, animate: false },
  edited: { label: '已编辑', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Edit3, animate: false },
}

export default function KnowledgePage() {
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState(null)
  const [moduleData, setModuleData] = useState(null)
  const [activeFile, setActiveFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fileLoading, setFileLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { loadModules() }, [])

  async function loadModules() {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      setModules(await res.json())
    } catch {}
    setLoading(false)
  }

  const filteredModules = modules.filter(m =>
    m.module_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAgentRunning = moduleData?.status === 'ai_native' && moduleData?.is_building

  async function selectModule(name) {
    setSelectedModule(name)
    setEditing(false)
    setActiveFile(null)
    setFileContent('')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/knowledge/${name}`)
      const data = await res.json()
      setModuleData(data)
      if (data.files?.length > 0) {
        loadFile(name, data.files[0])
      }
    } catch {}
  }

  async function loadFile(moduleName, filename) {
    setActiveFile(filename)
    setEditing(false)
    setErrorMsg('')
    setFileLoading(true)
    try {
      const res = await fetch(`/api/knowledge/${moduleName}/files/${filename}`)
      const data = await res.json()
      setFileContent(data.content || '')
    } catch {}
    setFileLoading(false)
  }

  async function saveFile() {
    if (!selectedModule || !activeFile) return
    setSaving(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/knowledge/${selectedModule}/files/${activeFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.status === 409) {
        const data = await res.json()
        setErrorMsg(data.detail || '知识库构建任务正在运行，暂时禁止编辑')
        setSaving(false)
        return
      }
      setFileContent(editContent)
      setEditing(false)
      selectModule(selectedModule)
    } catch (err) {
      setErrorMsg('保存失败: ' + err.message)
    }
    setSaving(false)
  }

  async function confirmModule() {
    if (!selectedModule) return
    setErrorMsg('')
    try {
      await fetch(`/api/knowledge/${selectedModule}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      selectModule(selectedModule)
      loadModules()
    } catch {}
  }

  function startEditing() {
    setEditContent(fileContent)
    setEditing(true)
    setErrorMsg('')
  }

  const badge = moduleData ? statusBadge[moduleData.status] || statusBadge.ai_native : null
  const BadgeIcon = badge?.icon || Sparkles

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-80px)]">
      {/* 左侧：模块列表 */}
      <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            知识模块
          </h2>
          <button onClick={loadModules} className="text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 搜索框 */}
        {modules.length > 5 && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索模块..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-600 py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : modules.length === 0 ? (
          <div className="text-center text-slate-600 py-8 text-sm">
            <FolderX className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            知识库为空
            <p className="text-slate-700 mt-1">前往首页构建知识库</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center text-slate-600 py-8 text-sm">无匹配模块</div>
        ) : (
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
            {filteredModules.map(m => {
              const mb = statusBadge[m.status] || statusBadge.ai_native
              const Mi = mb.icon
              return (
                <div
                  key={m.module_name}
                  onClick={() => selectModule(m.module_name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModule === m.module_name
                      ? 'border-cyan-500/30 bg-slate-800'
                      : 'border-transparent hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-200 font-mono truncate">{m.module_name}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${mb.color} ${mb.animate ? 'animate-pulse-glow' : ''}`}>
                      <Mi className="w-2.5 h-2.5" />
                      {mb.label}
                    </span>
                  </div>
                  {m.built_at && (
                    <p className="text-[10px] text-slate-600 mt-1">{new Date(m.built_at).toLocaleString('zh-CN')}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 右侧：详情面板 */}
      <div className="lg:col-span-3 flex flex-col">
        {!selectedModule ? (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-20 text-center text-slate-600">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p>选择左侧模块查看详情</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
            {/* 模块头部 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-slate-200 font-mono">{selectedModule}</span>
                {badge && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color} ${badge.animate ? 'animate-pulse-glow' : ''}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {moduleData?.status !== 'confirmed' && (
                  <button
                    onClick={confirmModule}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    确认
                  </button>
                )}
              </div>
            </div>

            {/* 错误提示 */}
            {errorMsg && (
              <div className="mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* 文件 Tab */}
            {moduleData?.files?.length > 0 ? (
              <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-thin">
                {moduleData.files.map(f => (
                  <button
                    key={f}
                    onClick={() => loadFile(selectedModule, f)}
                    className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      activeFile === f
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-slate-600 text-sm border-b border-slate-800">
                <FolderX className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                该模块暂无知识文件
              </div>
            )}

            {/* 文件内容 */}
            {moduleData?.files?.length > 0 && (
              <div className="p-4 flex-1 min-h-0 overflow-auto">
                {fileLoading ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">加载中...</span>
                  </div>
                ) : (
                  <FileContentViewer
                    filename={activeFile}
                    content={fileContent}
                    editing={editing}
                    editContent={editContent}
                    onEditChange={setEditContent}
                    onSave={saveFile}
                    onCancel={() => { setEditing(false); setErrorMsg('') }}
                    onStartEdit={startEditing}
                    saving={saving}
                    isAgentRunning={isAgentRunning}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
