import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'

const STATUSES = [
  { value:'todo', label:'مطلوب' },
  { value:'in_progress', label:'جارٍ التنفيذ' },
  { value:'blocked', label:'متوقفة' },
  { value:'done', label:'مكتملة' },
]
const PRIORITIES = [
  { value:'low', label:'منخفضة' },
  { value:'medium', label:'متوسطة' },
  { value:'high', label:'مرتفعة' },
  { value:'urgent', label:'عاجلة' },
]
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0,10) : '')

export default function TaskModal({ open, onClose, initial, users, clients, projects, onSaved }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('medium')
  const [due, setDue] = useState('')
  const [assignee, setAssignee] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (initial) {
      setTitle(initial.title || '')
      setDescription(initial.description || '')
      setStatus(initial.status || 'todo')
      setPriority(initial.priority || 'medium')
      setDue(toDateInput(initial.due_date))
      setAssignee(initial.assignee_id || '')
      setClientId(initial.client_id || '')
      setProjectId(initial.project_id || '')
    } else {
      setTitle(''); setDescription('')
      setStatus('todo'); setPriority('medium')
      setDue(''); setAssignee(''); setClientId(''); setProjectId('')
    }
  }, [open, initial])

  const canSave = useMemo(() => title.trim().length >= 3, [title])

  const save = async () => {
    if (!canSave) { setError('العنوان يجب أن لا يقل عن 3 أحرف'); return }
    setBusy(true); setError('')
    try {
      const row = {
        title: title.trim(),
        description: description.trim() || null,
        status, priority,
        due_date: due ? due : null,
        assignee_id: assignee || null,
        client_id: clientId || null,
        project_id: projectId || null,
      }
      let resp
      if (initial?.id) {
        resp = await supabase.from('tasks').update(row).eq('id', initial.id).select().single()
      } else {
        resp = await supabase.from('tasks').insert(row).select().single()
      }
      if (resp.error) throw resp.error
      onSaved && onSaved(resp.data)
      onClose()
    } catch (e) {
      setError(e.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Modal title={initial ? 'تعديل مهمة' : 'مهمة جديدة'} onClose={onClose}>
      <div style={{display:'grid', gap:12}}>
        <div>
          <label>العنوان</label>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان مختصر" />
        </div>

        <div>
          <label>الوصف</label>
          <textarea className="input" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="تفاصيل المهمة (اختياري)" />
        </div>

        <div className="row">
          <div>
            <label>الحالة</label>
            <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label>الأولوية</label>
            <select className="select" value={priority} onChange={e=>setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label>تاريخ الاستحقاق</label>
            <input className="input" type="date" value={due} onChange={e=>setDue(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>المسؤول</label>
            <select className="select" value={assignee} onChange={e=>setAssignee(e.target.value)}>
              <option value="">— بدون —</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
          <div>
            <label>العميل</label>
            <select className="select" value={clientId} onChange={e=>setClientId(e.target.value)}>
              <option value="">— بدون —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>المشروع</label>
            <select className="select" value={projectId} onChange={e=>setProjectId(e.target.value)}>
              <option value="">— بدون —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={{color:'#dc2626'}}>{error}</div>}

        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button className="btn secondary" onClick={onClose}>إلغاء</button>
          <button className="btn" onClick={save} disabled={busy || !canSave}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
