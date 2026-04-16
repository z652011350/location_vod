import { Outlet, Link, useLocation } from 'react-router-dom'
import { Activity, BookOpen, Home } from 'lucide-react'

export default function App() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '问题诊断', icon: Home },
    { path: '/knowledge', label: '知识库', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 顶部导航 */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Location VOD
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">HarmonyOS 问题辅助定位</span>
            </div>
            <div className="flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
