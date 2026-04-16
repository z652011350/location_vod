import MarkdownRenderer from './MarkdownRenderer'

export default function FileContentViewer({
  filename,
  content,
  editing,
  editContent,
  onEditChange,
  onSave,
  onCancel,
  onStartEdit,
  saving,
  isAgentRunning,
}) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  const isMarkdown = ext === 'md'
  const isEmpty = !content || content.trim() === ''

  if (isAgentRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">知识库正在重建中...</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">该文件暂无内容</p>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <textarea
          value={editContent}
          onChange={e => onEditChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-y min-h-[400px] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-cyan-500 text-white hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // JSON and other files: raw <pre> display
  if (!isMarkdown) {
    const formatted = ext === 'json'
      ? (() => { try { return JSON.stringify(JSON.parse(content), null, 2) } catch { return content } })()
      : content

    return (
      <div className="relative">
        <button
          onClick={onStartEdit}
          className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors z-10"
        >
          编辑
        </button>
        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap bg-slate-950 rounded-lg p-4 overflow-y-auto border border-slate-800">
          {formatted}
        </pre>
      </div>
    )
  }

  // Markdown files: rendered mode with edit toggle
  return (
    <div className="relative">
      <button
        onClick={onStartEdit}
        className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-300 bg-white hover:bg-gray-50 border border-gray-200 transition-colors z-10 shadow-sm"
      >
        编辑
      </button>
      <div className="bg-white rounded-lg p-6 overflow-y-auto border border-gray-200 text-sm">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  )
}
