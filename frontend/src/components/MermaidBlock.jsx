import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

let idCounter = 0

export default function MermaidBlock({ code }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [svgContent, setSvgContent] = useState('')
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const uniqueId = useRef(`mermaid-${++idCounter}`)

  // Drag state (refs to avoid re-renders during drag)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const contentRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !code) return

    let cancelled = false
    const renderId = `mermaid-${++idCounter}`
    uniqueId.current = renderId

    async function render() {
      try {
        setError(false)
        const { svg } = await mermaid.render(renderId, code)
        if (!cancelled) {
          setSvgContent(svg)
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
          }
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

  // Wheel zoom centered on mouse position
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    setScale(prev => {
      const next = Math.min(Math.max(prev * delta, 0.3), 10)
      const ratio = next / prev
      setPan(p => ({
        x: mouseX - ratio * (mouseX - p.x),
        y: mouseY - ratio * (mouseY - p.y),
      }))
      return next
    })
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <span>&#9888;</span> 图表渲染失败
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="mermaid-container my-4 flex justify-center cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => { setExpanded(true); setScale(1); setPan({ x: 0, y: 0 }) }}
        title="点击放大查看"
      />
      {expanded && svgContent && (
        <div
          className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center select-none"
          onClick={() => setExpanded(false)}
        >
          <div
            ref={contentRef}
            className="w-screen h-screen overflow-hidden"
            onClick={e => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
          >
            <div
              className="flex items-center justify-center w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{
                __html: svgContent
                  .replace(/\s*width="[^"]*"/, '')
                  .replace(/\s*height="[^"]*"/, '')
                  .replace('<svg', '<svg style="width:80vw;height:auto;max-width:none;background:white;border-radius:8px;padding:16px"')
              }}
            />
          </div>
          {/* Controls toolbar */}
          <div
            className="absolute top-4 right-4 z-10 flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
              <button
                onClick={() => setScale(s => Math.max(s / 1.2, 0.3))}
                className="text-white/80 hover:text-white w-7 h-7 flex items-center justify-center text-lg"
              >
                -
              </button>
              <span className="text-white/70 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(s * 1.2, 10))}
                className="text-white/80 hover:text-white w-7 h-7 flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-white/80 hover:text-white text-xl font-bold w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
