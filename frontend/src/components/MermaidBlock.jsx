import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

let idCounter = 0

export default function MermaidBlock({ code }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)
  const uniqueId = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    if (!containerRef.current || !code) return

    let cancelled = false
    const renderId = `mermaid-${++idCounter}`
    uniqueId.current = renderId

    async function render() {
      try {
        setError(false)
        const { svg } = await mermaid.render(renderId, code)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch {
        if (!cancelled) {
          setError(true)
          if (containerRef.current) {
            containerRef.current.innerHTML = ''
          }
        }
      }
    }

    render()

    return () => {
      cancelled = true
      const el = document.getElementById(`d${renderId}`)
      if (el) el.remove()
    }
  }, [code])

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <span>&#9888;</span> 图表渲染失败
      </div>
    )
  }

  return <div ref={containerRef} className="mermaid-container my-4 flex justify-center" />
}
