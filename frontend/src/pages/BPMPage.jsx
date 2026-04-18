import { useEffect, useState, useCallback, useRef } from 'react'
import ReactFlow, {
  addEdge,
  updateEdge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  X, Package, Link2, ChevronDown, ChevronRight,
  ShieldCheck, Trash2, GripVertical, ArrowRight, Table2, Layers,
} from 'lucide-react'

const STATUS_COLORS = {
  '未着手': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', flow: '#94a3b8' },
  '施工中': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', flow: '#3b82f6' },
  '完了': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', flow: '#22c55e' },
}

function CustomNode({ data }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS['未着手']
  const isMilestone = data.nodeType === 'milestone'
  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ width: 10, height: 10, background: '#64748b', border: '2px solid #fff' }} />
      <div className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[160px] ${colors.bg} ${colors.border} ${isMilestone ? 'border-dashed' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          {isMilestone && <span className="text-amber-500 text-xs">◆</span>}
          <span className={`font-semibold text-sm ${colors.text}`}>{data.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{data.duration_days}日間</span>
          <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}>{data.status}</span>
        </div>
        {data.master_columns?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.master_columns.slice(0, 3).map(f => (
              <span key={f.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 rounded text-xs text-gray-600 border border-gray-200">
                <Table2 size={9} /> {f.name}
              </span>
            ))}
            {data.master_columns.length > 3 && (
              <span className="px-1.5 py-0.5 bg-white/70 rounded text-xs text-gray-400">+{data.master_columns.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right}
        style={{ width: 10, height: 10, background: '#3b82f6', border: '2px solid #fff' }} />
    </>
  )
}

const nodeTypes = { custom: CustomNode }

const SIDEBAR_ITEMS = [
  { type: 'task', label: 'タスク', icon: '□' },
  { type: 'milestone', label: 'マイルストーン', icon: '◆' },
]

export default function BPMPage() {
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [masterData, setMasterData] = useState([])
  const [masterExpanded, setMasterExpanded] = useState({})
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const edgeUpdateSuccessful = useRef(true)

  const loadProjects = useCallback(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(data)
      if (data.length > 0 && !currentProject) setCurrentProject(data[0])
    })
  }, [currentProject])

  useEffect(() => { loadProjects() }, [loadProjects])
  useEffect(() => { fetch('/api/layers').then(r => r.json()).then(setMasterData) }, [])

  useEffect(() => {
    if (!currentProject) return
    const flowNodes = currentProject.nodes.map(n => ({
      id: String(n.id),
      type: 'custom',
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.label, nodeType: n.node_type, status: n.status, duration_days: n.duration_days, description: n.description, master_columns: n.master_columns },
    }))
    const flowEdges = currentProject.edges.map(e => ({
      id: String(e.id),
      source: String(e.source_node_id),
      target: String(e.target_node_id),
      label: e.label || '',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      animated: true,
      data: { dbId: e.id },
    }))
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [currentProject, setNodes, setEdges])

  const onConnect = useCallback(async (params) => {
    if (!currentProject) return
    const resp = await fetch('/api/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: currentProject.id, source_node_id: parseInt(params.source), target_node_id: parseInt(params.target) }),
    })
    const newEdge = await resp.json()
    setEdges(eds => addEdge({
      ...params, id: String(newEdge.id),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      animated: true, data: { dbId: newEdge.id },
    }, eds))
  }, [currentProject, setEdges])

  const onEdgeUpdateStart = useCallback(() => { edgeUpdateSuccessful.current = false }, [])

  const onEdgeUpdate = useCallback(async (oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true
    const dbId = oldEdge.data?.dbId || parseInt(oldEdge.id)
    await fetch(`/api/edges/${dbId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_node_id: parseInt(newConnection.source), target_node_id: parseInt(newConnection.target) }),
    })
    setEdges(els => updateEdge(oldEdge, newConnection, els))
    setSelectedEdge(null)
  }, [setEdges])

  const onEdgeUpdateEnd = useCallback(async (_, edge) => {
    if (!edgeUpdateSuccessful.current) {
      // Edge drag cancelled
    }
    edgeUpdateSuccessful.current = true
  }, [])

  const onNodeDragStop = useCallback(async (_event, node) => {
    await fetch(`/api/nodes/${node.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: node.position.x, position_y: node.position.y }),
    })
  }, [])

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
  }, [])

  const onEdgeClick = useCallback((_event, edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    setEdges(eds => eds.map(e => ({
      ...e,
      style: e.id === edge.id
        ? { stroke: '#f59e0b', strokeWidth: 3 }
        : { stroke: '#94a3b8', strokeWidth: 2 },
    })))
  }, [setEdges])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setEdges(eds => eds.map(e => ({ ...e, style: { stroke: '#94a3b8', strokeWidth: 2 } })))
  }, [setEdges])

  const deleteSelectedEdge = async () => {
    if (!selectedEdge) return
    const dbId = selectedEdge.data?.dbId || parseInt(selectedEdge.id)
    await fetch(`/api/edges/${dbId}`, { method: 'DELETE' })
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
    setSelectedEdge(null)
  }

  const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }, [])

  const onDrop = useCallback(async (event) => {
    event.preventDefault()
    if (!currentProject || !reactFlowInstance) return
    const type = event.dataTransfer.getData('application/reactflow-type')
    if (!type) return
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const resp = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: currentProject.id, label: type === 'milestone' ? '新マイルストーン' : '新タスク', node_type: type, position_x: position.x, position_y: position.y, duration_days: type === 'milestone' ? 1 : 7 }),
    })
    const newNode = await resp.json()
    setNodes(nds => [...nds, { id: String(newNode.id), type: 'custom', position: { x: newNode.position_x, y: newNode.position_y }, data: { label: newNode.label, nodeType: newNode.node_type, status: newNode.status, duration_days: newNode.duration_days, description: newNode.description, master_columns: [] } }])
  }, [currentProject, reactFlowInstance, setNodes])

  const updateSelectedNode = async (updates) => {
    if (!selectedNode) return
    const resp = await fetch(`/api/nodes/${selectedNode.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const updated = await resp.json()
    const newData = { label: updated.label, nodeType: updated.node_type, status: updated.status, duration_days: updated.duration_days, description: updated.description, master_columns: updated.master_columns || [] }
    setNodes(nds => nds.map(n => n.id === String(updated.id) ? { ...n, data: newData } : n))
    setSelectedNode(prev => ({ ...prev, data: newData }))
  }

  const deleteSelectedNode = async () => {
    if (!selectedNode) return
    await fetch(`/api/nodes/${selectedNode.id}`, { method: 'DELETE' })
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
  }

  const toggleMasterColumn = async (colId) => {
    if (!selectedNode) return
    const currentIds = (selectedNode.data.master_columns || []).map(c => c.id)
    const newIds = currentIds.includes(colId) ? currentIds.filter(id => id !== colId) : [...currentIds, colId]
    await updateSelectedNode({ master_column_ids: newIds })
  }

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const getNodeLabel = (nodeId) => {
    const n = nodes.find(n => n.id === nodeId)
    return n?.data?.label || nodeId
  }

  const renderMasterTree = (layers) => {
    if (!layers || layers.length === 0) return null
    return layers.map(layer => (
      <div key={layer.id}>
        <div className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-gray-800 py-0.5 font-medium"
          onClick={() => setMasterExpanded(p => ({ ...p, [`l${layer.id}`]: !p[`l${layer.id}`] }))}>
          {masterExpanded[`l${layer.id}`] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Layers size={10} />
          <span className="text-xs">{layer.name}</span>
        </div>
        {masterExpanded[`l${layer.id}`] && (
          <div className="ml-3">
            {layer.master_tables?.map(table => (
              <div key={table.id}>
                <div className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-700 py-0.5"
                  onClick={() => setMasterExpanded(p => ({ ...p, [`t${table.id}`]: !p[`t${table.id}`] }))}>
                  {masterExpanded[`t${table.id}`] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <Table2 size={10} />
                  <span className="text-xs">{table.name}</span>
                  <span className="text-gray-400 ml-1 text-[10px]">({table.columns?.length || 0}列)</span>
                </div>
                {masterExpanded[`t${table.id}`] && table.columns?.map(col => {
                  const linked = (selectedNode.data.master_columns || []).some(c => c.id === col.id)
                  return (
                    <div key={col.id}
                      className={`ml-5 flex items-center gap-1.5 py-0.5 cursor-pointer rounded px-1 text-xs ${linked ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                      onClick={() => toggleMasterColumn(col.id)}>
                      <input type="checkbox" checked={linked} readOnly className="rounded text-blue-600" />
                      <span>{col.name}</span>
                      <span className="text-gray-400 text-[10px]">{col.column_type}</span>
                    </div>
                  )
                })}
              </div>
            ))}
            {renderMasterTree(layer.children)}
          </div>
        )}
      </div>
    ))
  }

  const renderSidebarContent = () => {
    if (selectedEdge) {
      return (
        <div className="flex-1 overflow-auto p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">接続の詳細</h3>
            <button onClick={() => { setSelectedEdge(null); onPaneClick() }} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="space-y-3 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-700">
                <ArrowRight size={14} />
                <span className="font-medium">接続情報</span>
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-gray-500">接続元:</span>
                  <span className="ml-2 font-medium text-gray-800">{getNodeLabel(selectedEdge.source)}</span>
                </div>
                <div>
                  <span className="text-gray-500">接続先:</span>
                  <span className="ml-2 font-medium text-gray-800">{getNodeLabel(selectedEdge.target)}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-500">接続線の端をドラッグして接続先を変更できます。</p>
            <button onClick={deleteSelectedEdge}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs w-full justify-center">
              <Trash2 size={12} /> 接続を削除
            </button>
          </div>
        </div>
      )
    }

    if (selectedNode) {
      return (
        <div className="flex-1 overflow-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700">ノード詳細</h3>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">名前</label>
              <input value={selectedNode.data.label}
                onChange={e => { const v = e.target.value; setSelectedNode(p => ({ ...p, data: { ...p.data, label: v } })); setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: v } } : n)) }}
                onBlur={e => updateSelectedNode({ label: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">日数</label>
              <input type="number" value={selectedNode.data.duration_days}
                onChange={e => { const v = parseInt(e.target.value) || 1; setSelectedNode(p => ({ ...p, data: { ...p.data, duration_days: v } })) }}
                onBlur={e => updateSelectedNode({ duration_days: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm" min={1} />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">ステータス</label>
              <select value={selectedNode.data.status} onChange={e => updateSelectedNode({ status: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="未着手">未着手</option>
                <option value="施工中">施工中</option>
                <option value="完了">完了</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-500 mb-2 flex items-center gap-1"><Link2 size={12} /> マスタカラム選択</label>
              <p className="text-gray-400 mb-1">テーブルのカラムを選択</p>
              <div className="space-y-1 max-h-64 overflow-auto border border-gray-200 rounded p-2">
                {renderMasterTree(masterData)}
              </div>
            </div>

            <button onClick={deleteSelectedNode}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs w-full justify-center">
              <Trash2 size={12} /> ノードを削除
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex h-full">
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-2">プロジェクト</h3>
          <select className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
            value={currentProject?.id || ''}
            onChange={e => { const p = projects.find(p => p.id === parseInt(e.target.value)); setCurrentProject(p); setSelectedNode(null); setSelectedEdge(null) }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-2">ノードを追加</h3>
          <p className="text-xs text-gray-400 mb-2">ドラッグ＆ドロップ</p>
          <div className="space-y-2">
            {SIDEBAR_ITEMS.map(item => (
              <div key={item.type}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 cursor-grab hover:bg-gray-100 text-sm"
                onDragStart={e => onDragStart(e, item.type)} draggable>
                <GripVertical size={14} className="text-gray-400" />
                <span>{item.icon}</span>
                <span className="text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {renderSidebarContent()}

        {!selectedNode && !selectedEdge && (
          <div className="flex-1 p-3 text-xs text-gray-400">
            <p>ノードをクリックで選択</p>
            <p className="mt-1">接続線をクリックで選択・編集</p>
            <p className="mt-1">接続線の端をドラッグで再接続</p>
          </div>
        )}
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop} onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
          <MiniMap nodeColor={n => STATUS_COLORS[n.data?.status]?.flow || '#94a3b8'} />
        </ReactFlow>
      </div>
    </div>
  )
}
