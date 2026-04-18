import { useEffect, useState } from 'react'
import { Database, Layers, Table2, Columns3, Briefcase, GitBranch } from 'lucide-react'

const statCards = [
  { key: 'layer1_count', label: 'レイヤー1 (全社共通)', icon: Layers, color: 'bg-blue-500' },
  { key: 'layer2_count', label: 'レイヤー2 (一部共通)', icon: Layers, color: 'bg-orange-500' },
  { key: 'layer3_count', label: 'レイヤー3 (分類)', icon: Layers, color: 'bg-red-500' },
  { key: 'total_tables', label: 'マスタテーブル', icon: Table2, color: 'bg-emerald-500' },
  { key: 'total_columns', label: 'カラム', icon: Database, color: 'bg-indigo-500' },
  { key: 'total_records', label: 'レコード', icon: Database, color: 'bg-teal-500' },
  { key: 'total_projects', label: 'プロジェクト', icon: Briefcase, color: 'bg-purple-500' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <div className="p-8 text-gray-500">読み込み中...</div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className={`${color} text-white p-3 rounded-lg`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-800">{stats[key]}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">システム概要</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">マスタデータ管理 (MDM)</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>3階層のマスタデータ構造</li>
              <li>レイヤー1: 全社共通基幹システム</li>
              <li>レイヤー2: 一部共通マスタ（事業部横断）</li>
              <li>レイヤー3: 分類マスタ（部門固有）</li>
              <li>AI列マッピング・表記揺れ検知・統合サジェスト</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">工程管理 (BPM)</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>ドラッグ＆ドロップで工程ノードを作成</li>
              <li>ノード間の依存関係を接続線で表現</li>
              <li>各ノードにマスタデータを紐付け</li>
              <li>工程の進捗ステータス管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
