import { useState, useEffect, useRef } from 'react'
import { BookOpen, CheckCircle, Edit3, Sparkles, RefreshCw, Loader2, Search, AlertCircle, FileText, FolderX, Plus, Upload, FilePlus, X } from 'lucide-react'
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
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const addMenuRef = useRef(null)

  // 点击外部关闭添加菜单
  useEffect(() => {
    function handleClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false)
      }
    }
    if (showAddMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddMenu])

  useEffect(() => {
    let cancelled = false
    fetch('/api/knowledge')
      .then(r => r.json())
      .then(data => { if (!cancelled) { setModules(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  async function loadModules() {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      setModules(await res.json())
    } catch { /* network error, skip */ }
    setLoading(false)
  }

  const filteredModules = modules.filter(m =>
    m.module_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAgentRunning = moduleData?.is_running === true

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
    } catch { /* network error, skip */ }
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
    } catch { /* network error, skip */ }
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
    } catch { /* network error, skip */ }
  }

  function startEditing() {
    setEditContent(fileContent)
    setEditing(true)
    setErrorMsg('')
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setErrorMsg('')
    setShowAddMenu(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/knowledge/${selectedModule}/files`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '上传失败')
      }
      selectModule(selectedModule)
    } catch (err) {
      setErrorMsg('上传失败: ' + err.message)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCreateTextFile() {
    if (!newFileName.trim()) return
    setUploading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/knowledge/${selectedModule}/files/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newFileName.trim(), content: '' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || '创建失败')
      }
      setShowCreateDialog(false)
      setNewFileName('')
      await selectModule(selectedModule)
      // 自动选中新创建的文件并进入编辑模式
      setActiveFile(newFileName.trim())
      setEditContent('')
      setEditing(true)
    } catch (err) {
      setErrorMsg('创建失败: ' + err.message)
    }
    setUploading(false)
  }

  const badge = moduleData ? statusBadge[moduleData.status] || statusBadge.ai_native : null
  const BadgeIcon = badge?.icon || Sparkles

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-104px)] lg:grid-rows-1">
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
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col relative">
            {/* 隐藏的文件输入，始终挂载以保证 ref 有效 */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

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
              <div className="flex border-b border-slate-800 items-center">
                <div className="flex overflow-x-auto flex-1 scrollbar-thin">
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
                {!isAgentRunning && (
                  <div className="relative shrink-0" ref={addMenuRef}>
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      disabled={uploading}
                      className="px-2 py-1 text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                      title="添加文件"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                    {showAddMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                        <button
                          onClick={() => { setShowAddMenu(false); fileInputRef.current?.click() }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          上传文件
                        </button>
                        <button
                          onClick={() => { setShowAddMenu(false); setShowCreateDialog(true) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          新建文本文件
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-slate-600 text-sm border-b border-slate-800">
                <FolderX className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                该模块暂无知识文件
                {!isAgentRunning && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      上传文件
                    </button>
                    <button
                      onClick={() => setShowCreateDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-colors"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      新建文本文件
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 新建文件对话框 */}
            {showCreateDialog && (
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/50 flex items-center gap-3">
                <input
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="输入文件名（如 notes.md）"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  onKeyDown={e => e.key === 'Enter' && handleCreateTextFile()}
                  autoFocus
                />
                <button
                  onClick={handleCreateTextFile}
                  disabled={!newFileName.trim() || uploading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '创建'}
                </button>
                <button
                  onClick={() => { setShowCreateDialog(false); setNewFileName('') }}
                  className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
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
