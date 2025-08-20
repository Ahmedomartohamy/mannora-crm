import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'

const STAGES = [
  { value:'new', label:'جديد' },
  { value:'contacted', label:'تم التواصل' },
  { value:'qualified', label:'مؤهّل' },
  { value:'proposal', label:'عرض مُرسل' },
  { value:'won', label:'مكتسب' },
  { value:'lost', label:'مفقود' },
]
const SOURCES = [
  { value:'referral', label:'ترشيح' },
  { value:'website',  label:'الموقع' },
  { value:'ads',      label:'إعلانات' },
  { value:'cold_call',label:'اتصال بارد' },
  { value:'event',    label:'فعالية' },
  { value:'other',    label:'أخرى' },
]
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0,10) : '')
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const sanitizeEmail = (s='') => s.toString().replace(/[\u200e\u200f<>]/g,'').replace(/\s/g,'').trim()

export default function LeadModal({ open, onClose, initial, onSaved, canPickOwner=false, users=[] }) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [stage, setStage] = useState('new')
  const [score, setScore] = useState('')
  const [value, setValue] = useState('')
  const [expected, setExpected] = useState('')
  const [notes, setNotes] = useState('')
  const [owner, setOwner] = useState('') // للأدمن/المانجر فقط
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (initial) {
      setName(initial.name || '')
      setCompany(initial.company || '')
      setEmail(initial.email || '')
      setPhone(initial.phone || '')
      setSource(initial.source || '')
      setStage(initial.stage || 'new')
      setScore(initial.score ?? '')
      setValue(initial.value ?? '')
      setExpected(toDateInput(initial.expected_close))
      setNotes(initial.notes || '')
      setOwner(initial.owner_id || '')
    } else {
      setName(''); setCompany(''); setEmail(''); setPhone(''); setSource('')
      setStage('new'); setScore(''); setValue(''); setExpected(''); setNotes(''); setOwner('')
    }
  }, [open, initial])

  const canSave = useMemo(() => name.trim().length >= 3, [name])

  const save = async () => {
    if (!canSave) { setError('الاسم لا يقل عن 3 أحرف'); return }
    const e = sanitizeEmail(email)
    if (e && !EMAIL_RE.test(e)) { setError('صيغة البريد غير صحيحة'); return }
    setBusy(true); setError('')
    try {
      const row = {
        name: name.trim(),
        company: company.trim() || null,
        email: e || null,
        phone: phone.trim() || null,
        source: source || null,
        stage,
        score: score === '' ? null : Number(score),
        value: value === '' ? null : Number(value),
        expected_close: expected || null,
        notes: notes.trim() || null,
        ...(canPickOwner && owner ? { owner_id: owner } : {})
      }
      let resp
      if (initial?.id) {
        resp = await supabase.from('leads').update(row).eq('id', initial.id).select().single()
      } else {
        resp = await supabase.from('leads').insert(row).select().single()
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
    <Modal title={initial ? 'تعديل عميل محتمل' : 'عميل محتمل جديد'} onClose={onClose}>
      <div style={{display:'grid', gap:12}}>
        <div className="row">
          <div style={{flex:1}}>
            <label>الاسم *</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="اسم الشخص/الشركة" />
          </div>
          <div style={{flex:1}}>
            <label>الشركة</label>
            <input className="input" value={company} onChange={e=>setCompany(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>البريد</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label>الهاتف</label>
            <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
          <div>
            <label>المصدر</label>
            <select className="select" value={source} onChange={e=>setSource(e.target.value)}>
              <option value="">— اختر —</option>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label>المرحلة</label>
            <select className="select" value={stage} onChange={e=>setStage(e.target.value)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label>التقييم (0-100)</label>
            <input className="input" type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)} />
          </div>
          <div>
            <label>القيمة المتوقعة</label>
            <input className="input" type="number" step="0.01" value={value} onChange={e=>setValue(e.target.value)} />
          </div>
          <div>
            <label>تاريخ الإغلاق المتوقع</label>
            <input className="input" type="date" value={expected} onChange={e=>setExpected(e.target.value)} />
          </div>
        </div>

        <div>
          <label>ملاحظات</label>
          <textarea className="input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        {canPickOwner && (
          <div>
            <label>المالك (للمدراء/الأدمن)</label>
            <select className="select" value={owner} onChange={e=>setOwner(e.target.value)}>
              <option value="">— الحالي —</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
        )}

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
