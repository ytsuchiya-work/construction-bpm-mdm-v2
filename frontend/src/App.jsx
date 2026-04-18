import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Database, GitBranch } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import MasterDataPage from './pages/MasterDataPage'
import BPMPage from './pages/BPMPage'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/master', icon: Database, label: 'マスタデータ管理' },
  { to: '/bpm', icon: GitBranch, label: '工程管理 (BPM)' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <aside className="w-60 bg-slate-800 text-white flex flex-col">
          <div className="px-4 py-5 border-b border-slate-700">
            <h1 className="text-lg font-bold tracking-tight">建設BPM+MDM</h1>
            <p className="text-xs text-slate-400 mt-1">マスタデータ統合 &amp; 工程管理</p>
          </div>
          <nav className="flex-1 py-4">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white border-r-2 border-blue-400'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
            Demo v2.0
          </div>
        </aside>
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/master" element={<MasterDataPage />} />
            <Route path="/bpm" element={<BPMPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
