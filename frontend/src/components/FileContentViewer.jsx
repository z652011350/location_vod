import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MermaidBlock from './MermaidBlock'

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const codeStr = String(children).replace(/\n$/, '')
          const lang = className?.replace('language-', '') || ''

          if (lang === 'mermaid') {
            return <MermaidBlock code={codeStr} />
          }

          const isInline = !className && !codeStr.includes('\n')
          if (isInline) {
            return (
              <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            )
          }

          return (
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm my-4">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          )
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300 text-sm">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-left font-semibold text-gray-800">{children}</th>
        },
        td({ children }) {
          return <td className="border border-gray-300 px-3 py-2 text-gray-700">{children}</td>
        },
        h1({ children }) {
          return <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold text-gray-800 mt-5 mb-2 pb-1 border-b border-gray-100">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>
        },
        h4({ children }) {
          return <h4 className="text-base font-semibold text-gray-700 mt-3 mb-1">{children}</h4>
        },
        p({ children }) {
          return <p className="text-gray-700 leading-relaxed my-2">{children}</p>
        },
        ul({ children }) {
          return <ul className="list-disc list-inside my-2 space-y-1 text-gray-700">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside my-2 space-y-1 text-gray-700">{children}</ol>
        },
        li({ children }) {
          return <li className="text-gray-700">{children}</li>
        },
        blockquote({ children }) {
          return <blockquote className="border-l-4 border-gray-300 pl-4 my-3 text-gray-600 italic">{children}</blockquote>
        },
        a({ href, children }) {
          return <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>
        },
        hr() {
          return <hr className="my-6 border-gray-200" />
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

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
        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap bg-slate-950 rounded-lg p-4 max-h-[500px] overflow-y-auto border border-slate-800">
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
      <div className="bg-white rounded-lg p-6 max-h-[600px] overflow-y-auto border border-gray-200 text-sm">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  )
}
