import { useEffect, useMemo, useState, useCallback } from 'react'
import Layout from '../../components/Layout'
import LeadModal from './LeadModal'
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

const STAGES = [
  { value:'new',        label:'جديد' },
  { value:'contacted',  label:'تم التواصل' },
  { value:'qualified',  label:'مؤهّل' },
  { value:'proposal',   label:'عرض مُرسل' },
  { value:'won',        label:'مكتسب' },
  { value:'lost',       label:'مفقود' },
]

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
            اسحب عميل محتمل إلى هنا
          </div>
        )}
      </div>
    </div>
  )
}

function LeadCard({ lead, ownerName, onEdit, onDel, onConvert, attributes, listeners, setNodeRef, transform, isDragging }) {
  const style = {
    cursor:'grab', boxShadow:'none', border:'1px solid #e5e7eb', background:'white',
    transform: CSS.Translate.toString(transform)
  }
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="card" style={{...style, opacity:isDragging?0.85:1}}>
      <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
        <div style={{fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
          {lead.name}
        </div>
        <div style={{fontSize:12, padding:'2px 8px', borderRadius:12, border:'1px solid #e5e7eb'}}>
          {lead.value != null ? Number(lead.value).toLocaleString() : '—'}
        </div>
      </div>
      <div style={{fontSize:13, opacity:0.8, marginTop:4}}>
        {lead.company || lead.email || lead.phone || '—'}
      </div>
      <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontSize:12, opacity:0.8}}>مالك: {ownerName(lead.owner_id)}</div>
        <div>
          <span className="link" onClick={()=>onEdit(lead)}>تعديل</span>
          <span className="link" style={{marginInlineStart:8}} onClick={()=>onDel(lead)}>حذف</span>
          <span className="link" style={{marginInlineStart:8, opacity:lead.client_id ? 0.5:1, pointerEvents:lead.client_id?'none':'auto'}} onClick={()=>onConvert(lead)}>تحويل</span>
        </div>
      </div>
    </div>
  )
}

function DraggableLead({ lead, ownerName, onEdit, onDel, onConvert }) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: lead.id, data:{ type:'lead', stage: lead.stage }
  })
  return (
    <LeadCard
      lead={lead}
      ownerName={ownerName}
      onEdit={onEdit}
      onDel={onDel}
      onConvert={onConvert}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      isDragging={isDragging}
    />
  )
}

export default function LeadsBoard() {
  const [me, setMe] = useState(null)
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [users, setUsers] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState(''); const [fltOwner, setFltOwner] = useState(''); const [onlyMine, setOnlyMine] = useState(false)
  const [modalOpen, setModalOpen] = useState(false); const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user || null))
    Promise.all([supabase.rpc('is_admin'), supabase.rpc('has_role', { r: 'manager' })])
      .then(([a,m]) => setIsAdminOrManager(Boolean(a?.data)||Boolean(m?.data)))
  }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error || !Array.isArray(data)) {
      const u = (await supabase.auth.getUser()).data.user
      setUsers(u ? [{ user_id: u.id, email: u.email, full_name: u.user_metadata?.full_name }] : [])
    } else setUsers(data)
  }
  const loadLeads = async () => {
    setLoading(true); setError('')
    const sel = await supabase.from('leads').select('*').order('updated_at', { ascending:false }).order('created_at', { ascending:false })
    setLoading(false); if (sel.error) setError(sel.error.message); else setRows(sel.data || [])
  }
  useEffect(() => {
    loadUsers(); loadLeads()
    // لو Realtime متفعّل هيحدّث لوحده، وإلا التحديث المتفائل يكفي
    const ch = supabase.channel('leads-board').on('postgres_changes', { event:'*', schema:'public', table:'leads' }, () => loadLeads()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(l => {
      if (term) {
        const txt = `${l.name} ${l.company||''} ${l.email||''} ${l.phone||''} ${l.notes||''}`.toLowerCase()
        if (!txt.includes(term)) return false
      }
      if (fltOwner && (l.owner_id||'') !== fltOwner) return false
      if (onlyMine && me && l.owner_id !== me.id) return false
      return true
    })
  }, [rows, q, fltOwner, onlyMine, me])

  const leadsByStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map(s => [s.value, []]))
    for (const l of filtered) (m[l.stage || 'new'] || m['new']).push(l)
    Object.keys(m).forEach(k => m[k].sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at)))
    return m
  }, [filtered])

  const ownerName = useCallback((uid) => {
    const u = users.find(x => x.user_id === uid)
    return u?.full_name || u?.email || '—'
  }, [users])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = async ({active, over}) => {
    if (!active || !over) return
    const destStage = over?.data?.current?.type === 'column'
      ? over.data.current.stage
      : (typeof over?.id === 'string' ? over.id : null)
    if (!destStage) return

    const leadId = active.id
    const current = rows.find(r => r.id === leadId)
    if (!current || current.stage === destStage) return

    // تحديث متفائل فوري
    setRows(prev => prev.map(r => r.id === leadId
      ? { ...r, stage: destStage, updated_at: new Date().toISOString() }
      : r
    ))

    // حفظ في الداتابيس
    const { error } = await supabase.from('leads').update({ stage: destStage }).eq('id', leadId)
    if (error) {
      alert(error.message)
      // رجوع في حالة الفشل
      setRows(prev => prev.map(r => r.id === leadId ? { ...r, stage: current.stage } : r))
    }
  }

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (l) => { setEditing(l); setModalOpen(true) }
  const del = async (l) => { if (!confirm('هل تريد حذف هذا العميل المحتمل؟')) return; const { error } = await supabase.from('leads').delete().eq('id', l.id); if (error) alert(error.message) }
  const convertLead = async (l) => { if (l.client_id) return alert('تم التحويل بالفعل'); if (!confirm('تحويل إلى عميل؟')) return; const { error } = await supabase.rpc('lead_convert_to_client', { p_lead_id: l.id }); if (error) alert(error.message) }

  return (
    <Layout>
      <div className="header">
        <h2>كانبان العملاء المحتملين</h2>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input className="input" placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)} style={{width:240}} />
          {isAdminOrManager && (
            <select className="select" value={fltOwner} onChange={e=>setFltOwner(e.target.value)}>
              <option value="">كل المالكين</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
            </select>
          )}
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} />
            مملوك لي فقط
          </label>
          <button className="btn" onClick={openNew}>عميل محتمل جديد</button>
          <Link className="btn secondary" to="/leads">عرض القائمة</Link>
        </div>
      </div>

      {loading ? <div className="card">جارٍ التحميل…</div> :
       error   ? <div className="card" style={{color:'#dc2626'}}>{error}</div> :
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
         <div style={{display:'grid', gridTemplateColumns:'repeat(6, minmax(240px, 1fr))', gap:12}}>
           {STAGES.map(s => (
             <Column key={s.value} id={s.value} title={s.label} count={(leadsByStage[s.value]||[]).length}>
               {(leadsByStage[s.value] || []).map(l =>
                 <DraggableLead key={l.id} lead={l} ownerName={ownerName} onEdit={openEdit} onDel={del} onConvert={convertLead} />
               )}
             </Column>
           ))}
         </div>
       </DndContext>}
      <LeadModal open={modalOpen} onClose={()=>setModalOpen(false)} initial={editing} onSaved={()=>loadLeads()} canPickOwner={isAdminOrManager} users={users} />
    </Layout>
  )
}
