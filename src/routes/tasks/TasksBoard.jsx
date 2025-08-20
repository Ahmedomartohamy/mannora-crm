import { useEffect, useMemo, useState, useCallback } from 'react'
import Layout from '../../components/Layout'
import TaskModal from './TaskModal'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

import {
  DndContext,
  useSensor, useSensors,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const STATUSES = [
  { value:'todo',         label:'مطلوب' },
  { value:'in_progress',  label:'جارٍ التنفيذ' },
  { value:'blocked',      label:'متوقفة' },
  { value:'done',         label:'مكتملة' },
]
const PRIORITY_LABEL = { low:'منخفضة', medium:'متوسطة', high:'مرتفعة', urgent:'عاجلة' }

function Column({ id, title, count, children }) {
  const { isOver, setNodeRef } = useDroppable({ id, data:{ type:'column', stage:id } })
  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        minHeight:220, display:'flex', flexDirection:'column',
        outline: isOver ? '2px dashed #60a5fa' : 'none', outlineOffset:4
      }}
    >
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <h3 style={{margin:0}}>{title}</h3>
        <span style={{opacity:0.7, fontSize:12}}>{count}</span>
      </div>
      <div style={{display:'grid', gap:8}}>
        {children}
        {count === 0 && (
          <div style={{opacity:0.5, textAlign:'center', padding:'12px 6px', border:'1px dashed #e5e7eb', borderRadius:12}}>
            اسحب مهمة إلى هنا
          </div>
        )}
      </div>
    </div>
  )
}
function TaskCard({ task, userName, onEdit, onDel, attributes, listeners, setNodeRef, transform, isDragging }) {
  const style = {
    cursor:'grab', boxShadow:'none', border:'1px solid #e5e7eb', background:'white',
    transform: CSS.Translate.toString(transform)
  }
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="card" style={{...style, opacity:isDragging?0.85:1}}>
      <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
        <div style={{fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
          {task.title}
        </div>
        <div style={{fontSize:12, padding:'2px 8px', borderRadius:12, border:'1px solid #e5e7eb'}}>
          {PRIORITY_LABEL[task.priority] || task.priority}
        </div>
      </div>
      <div style={{fontSize:13, opacity:0.8, marginTop:4}}>
        مسؤول: {userName(task.assignee_id)} {task.due_date ? `• الاستحقاق: ${task.due_date}` : ''}
      </div>
      <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center', justifyContent:'flex-end'}}>
        <span className="link" onClick={()=>onEdit(task)}>تعديل</span>
        <span className="link" onClick={()=>onDel(task)}>حذف</span>
      </div>
    </div>
  )
}
function DraggableTask({ task, userName, onEdit, onDel }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: task.id, data:{ type:'task', stage: task.status }
  })
  return (
    <TaskCard
      task={task}
      userName={userName}
      onEdit={onEdit}
      onDel={onDel}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      isDragging={isDragging}
    />
  )
}

export default function TasksBoard() {
  const [me, setMe] = useState(null)
  const [hasOrderIndex, setHasOrderIndex] = useState(null)

  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [fltAssignee, setFltAssignee] = useState('')
  const [fltClient, setFltClient] = useState('')
  const [fltProject, setFltProject] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user || null)) }, [])
  useEffect(() => { (async () => { const probe = await supabase.from('tasks').select('order_index').limit(1); setHasOrderIndex(!probe.error) })() }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error || !Array.isArray(data)) {
      const u = (await supabase.auth.getUser()).data.user
      setUsers(u ? [{ user_id: u.id, email: u.email, full_name: u.user_metadata?.full_name }] : [])
    } else setUsers(data)
  }
  const loadClients = async () => { const { data, error } = await supabase.from('clients').select('id,name').order('name', { ascending:true }); setClients(error?[]:(data||[])) }
  const loadProjects = async () => { const { data, error } = await supabase.from('projects').select('id,name').order('name', { ascending:true }); setProjects(error?[]:(data||[])) }

  const loadTasks = async () => {
    setLoading(true); setError('')
    let sel
    if (hasOrderIndex) {
      sel = await supabase.from('tasks')
        .select('id,title,description,status,priority,due_date,created_by,assignee_id,client_id,project_id,created_at,updated_at,order_index')
        .order('order_index', { ascending:true, nullsFirst:false })
        .order('updated_at', { ascending:false })
    } else {
      sel = await supabase.from('tasks')
        .select('id,title,description,status,priority,due_date,created_by,assignee_id,client_id,project_id,created_at,updated_at')
        .order('updated_at', { ascending:false })
        .order('created_at', { ascending:false })
    }
    setLoading(false); if (sel.error) setError(sel.error.message); else setRows(sel.data || [])
  }

  useEffect(() => { loadUsers(); loadClients(); loadProjects() }, [])
  useEffect(() => {
    if (hasOrderIndex === null) return
    loadTasks()
    const ch = supabase.channel('tasks-board').on('postgres_changes', { event:'*', schema:'public', table:'tasks' }, () => loadTasks()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [hasOrderIndex])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(t => {
      if (term && !`${t.title} ${t.description||''}`.toLowerCase().includes(term)) return false
      if (fltAssignee && (t.assignee_id || '') !== fltAssignee) return false
      if (fltClient && (t.client_id || '') !== fltClient) return false
      if (fltProject && (t.project_id || '') !== fltProject) return false
      if (onlyMine && me && !((t.created_by===me.id)||(t.assignee_id===me.id))) return false
      return true
    })
  }, [rows, q, fltAssignee, fltClient, fltProject, onlyMine, me])

  const tasksByStatus = useMemo(() => {
    const m = Object.fromEntries(STATUSES.map(s => [s.value, []]))
    for (const t of filtered) (m[t.status || 'todo'] || m['todo']).push(t)
    if (hasOrderIndex) {
      Object.keys(m).forEach(k => m[k].sort((a,b) => {
        const ao = a.order_index ?? Number.MAX_SAFE_INTEGER
        const bo = b.order_index ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        return new Date(b.updated_at) - new Date(a.updated_at)
      }))
    } else {
      Object.keys(m).forEach(k => m[k].sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at)))
    }
    return m
  }, [filtered, hasOrderIndex])

  const userName = useCallback((uid) => {
    const u = users.find(x => x.user_id === uid)
    return u?.full_name || u?.email || '—'
  }, [users])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = async ({active, over}) => {
    if (!active || !over) return
    const destStatus = over?.data?.current?.type === 'column'
      ? over.data.current.stage
      : (typeof over?.id === 'string' ? over.id : null)
    if (!destStatus) return

    const taskId = active.id
    const current = rows.find(r => r.id === taskId)
    if (!current || current.status === destStatus) return

    // نحسب order_index الجديد لو العمود موجود
    let nextOrderIndex
    if (hasOrderIndex) {
      const col = rows.filter(t => t.id !== taskId && t.status === destStatus)
      const minVal = col.length ? Math.min(...col.map(t => (t.order_index ?? 0))) : null
      nextOrderIndex = (minVal === null) ? 0 : (minVal - 1)
    }

    // تحديث متفائل
    setRows(prev => {
      const copy = [...prev]
      const i = copy.findIndex(t => t.id === taskId)
      if (i === -1) return prev
      copy[i] = {
        ...copy[i],
        status: destStatus,
        updated_at: new Date().toISOString(),
        ...(hasOrderIndex ? { order_index: nextOrderIndex } : {})
      }
      return copy
    })

    // حفظ في الداتابيس
    const patch = hasOrderIndex ? { status: destStatus, order_index: nextOrderIndex } : { status: destStatus }
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId)
    if (error) {
      alert(error.message)
      // رجوع لو فشل
      setRows(prev => prev.map(t => t.id === taskId ? { ...t, status: current.status, order_index: current.order_index } : t))
    }
  }

  return (
    <Layout>
      <div className="header">
        <h2>كانبان المهام</h2>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input className="input" placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)} style={{width:240}} />
          <select className="select" value={fltAssignee} onChange={e=>setFltAssignee(e.target.value)}>
            <option value="">كل المسؤولين</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
          </select>
          <select className="select" value={fltClient} onChange={e=>setFltClient(e.target.value)}>
            <option value="">كل العملاء</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={fltProject} onChange={e=>setFltProject(e.target.value)}>
            <option value="">كل المشاريع</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} />
            مهامي فقط
          </label>
          <button className="btn" onClick={()=>{ setEditing(null); setModalOpen(true) }}>مهمة جديدة</button>
          <Link className="btn secondary" to="/tasks">عرض القائمة</Link>
        </div>
      </div>

      {(loading || hasOrderIndex===null) ? <div className="card">جارٍ التحميل…</div> :
       error ? <div className="card" style={{color:'#dc2626'}}>{error}</div> :
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
         <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(260px, 1fr))', gap:12}}>
           {STATUSES.map(s => (
             <Column key={s.value} id={s.value} title={s.label} count={(tasksByStatus[s.value]||[]).length}>
               {(tasksByStatus[s.value] || []).map(t =>
                 <DraggableTask key={t.id} task={t} userName={(uid)=>users.find(u=>u.user_id===uid)?.full_name || users.find(u=>u.user_id===uid)?.email || '—'} onEdit={(tt)=>{ setEditing(tt); setModalOpen(true) }} onDel={async (tt)=>{ if (!confirm('هل تريد حذف هذه المهمة؟')) return; const { error } = await supabase.from('tasks').delete().eq('id', tt.id); if (error) alert(error.message) }} />
               )}
             </Column>
           ))}
         </div>
       </DndContext>}

      <TaskModal
        open={modalOpen}
        onClose={()=>setModalOpen(false)}
        initial={editing}
        users={users}
        clients={clients}
        projects={projects}
        onSaved={()=>loadTasks()}
      />
    </Layout>
  )
}
