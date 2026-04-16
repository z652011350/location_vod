import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MermaidBlock from './MermaidBlock'

const darkComponents = {
  code({ className, children, ...props }) {
    const codeStr = String(children).replace(/\n$/, '')
    const lang = className?.replace('language-', '') || ''

    if (lang === 'mermaid') {
      return <MermaidBlock code={codeStr} />
    }

    const isInline = !className && !codeStr.includes('\n')
    if (isInline) {
      return (
        <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }

    return (
      <pre className="bg-slate-950 text-slate-200 rounded-lg p-4 overflow-x-auto text-sm my-4 border border-slate-800">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-slate-700 text-sm">{children}</table>
      </div>
    )
  },
  th({ children }) {
    return <th className="border border-slate-700 px-3 py-2 bg-slate-800 text-left font-semibold text-slate-200">{children}</th>
  },
  td({ children }) {
    return <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>
  },
  h1({ children }) {
    return <h1 className="text-2xl font-bold text-slate-100 mt-6 mb-3 pb-2 border-b border-slate-700">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-xl font-bold text-slate-100 mt-5 mb-2 pb-1 border-b border-slate-700/50">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-2">{children}</h3>
  },
  h4({ children }) {
    return <h4 className="text-base font-semibold text-slate-200 mt-3 mb-1">{children}</h4>
  },
  p({ children }) {
    return <p className="text-slate-300 leading-relaxed my-2">{children}</p>
  },
  ul({ children }) {
    return <ul className="list-disc list-inside my-2 space-y-1 text-slate-300">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-2 space-y-1 text-slate-300">{children}</ol>
  },
  li({ children }) {
    return <li className="text-slate-300">{children}</li>
  },
  blockquote({ children }) {
    return <blockquote className="border-l-4 border-slate-600 pl-4 my-3 text-slate-400 italic">{children}</blockquote>
  },
  a({ href, children }) {
    return <a href={href} className="text-cyan-400 underline hover:text-cyan-300" target="_blank" rel="noopener noreferrer">{children}</a>
  },
  hr() {
    return <hr className="my-6 border-slate-700" />
  },
  strong({ children }) {
    return <strong className="text-slate-100 font-semibold">{children}</strong>
  },
}

export function DarkMarkdownRenderer({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={darkComponents}>
      {content}
    </ReactMarkdown>
  )
}

export default function MarkdownRenderer({ content }) {
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
