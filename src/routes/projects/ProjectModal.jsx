
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_OPTIONS = ['New','In Progress','On Hold','Completed','Cancelled']

export default function ProjectModal({ initial, clients, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    status: initial?.status || 'New',
    budget: initial?.budget ?? 0,
    client_id: initial?.client_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('الاسم مطلوب'); return }
    setLoading(true)
    let payload = { ...form, budget: Number(form.budget) || 0, client_id: form.client_id || null }
    let resp
    if (initial?.id) {
      resp = await supabase.from('projects').update(payload).eq('id', initial.id).select()
    } else {
      resp = await supabase.from('projects').insert([payload]).select()
    }
    setLoading(false)
    if (resp.error) setError(resp.error.message)
    else onSaved()
  }

  return (
    <form onSubmit={onSubmit} style={{display:'grid', gap:10}}>
      <div className="row">
        <div>
          <label>الاسم</label>
          <input className="input" name="name" value={form.name} onChange={onChange} required />
        </div>
        <div>
          <label>الحالة</label>
          <select className="select" name="status" value={form.status} onChange={onChange}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>الميزانية</label>
          <input className="input" type="number" min="0" step="0.01" name="budget" value={form.budget} onChange={onChange} />
        </div>
        <div>
          <label>العميل</label>
          <select className="select" name="client_id" value={form.client_id} onChange={onChange}>
            <option value="">— بدون عميل —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {error && <div style={{color:'#dc2626'}}>{error}</div>}
      <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
        <button type="button" className="btn secondary" onClick={onCancel}>إلغاء</button>
        <button className="btn" disabled={loading}>{loading ? 'جارٍ الحفظ…' : 'حفظ'}</button>
      </div>
    </form>
  )
}
