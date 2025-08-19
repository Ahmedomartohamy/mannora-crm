
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ClientModal({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('الاسم مطلوب'); return }
    setLoading(true)
    let resp
    if (initial?.id) {
      resp = await supabase.from('clients').update(form).eq('id', initial.id).select()
    } else {
      resp = await supabase.from('clients').insert([form]).select()
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
          <label>البريد</label>
          <input className="input" type="email" name="email" value={form.email} onChange={onChange} />
        </div>
        <div>
          <label>الهاتف</label>
          <input className="input" name="phone" value={form.phone} onChange={onChange} />
        </div>
        <div>
          <label>الشركة</label>
          <input className="input" name="company" value={form.company} onChange={onChange} />
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
