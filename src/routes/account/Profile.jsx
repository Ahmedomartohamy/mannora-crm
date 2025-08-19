import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const sanitizeEmail = (s='') =>
  s.toString().replace(/[\u200e\u200f<>]/g,'').replace(/\s/g,'').trim()

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // الاسم
  const [fullName, setFullName] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [nameBusy, setNameBusy] = useState(false)

  // الإيميل
  const [email, setEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  // الباسورد
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      setUser(u || null)
      if (u) {
        // جِب الاسم من profiles أو من user_metadata
        const { data, error } = await supabase.from('profiles').select('full_name').eq('id', u.id).single()
        setFullName(data?.full_name ?? u.user_metadata?.full_name ?? '')
        setEmail(u.email || '')
      }
      setLoading(false)
    }
    run()
  }, [])

  const saveName = async () => {
    setNameErr(''); setNameMsg('')
    if (!fullName.trim()) { setNameErr('الاسم لا يمكن أن يكون فارغًا'); return }
    try {
      setNameBusy(true)
      // حدّث profiles
      const up = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName.trim() }, { onConflict: 'id' })
      if (up.error) throw up.error
      // وحدّث ميتاداتا المستخدم (عشان يبان في أي مكان آخر)
      const { error: e2 } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      if (e2) throw e2
      setNameMsg('تم حفظ الاسم بنجاح ✅')
    } catch (e) {
      setNameErr(e.message)
    } finally {
      setNameBusy(false)
    }
  }

  const saveEmail = async () => {
    setEmailErr(''); setEmailMsg('')
    const e = sanitizeEmail(email)
    if (!EMAIL_RE.test(e)) { setEmailErr('صيغة البريد غير صحيحة'); return }
    try {
      setEmailBusy(true)
      const { data, error } = await supabase.auth.updateUser({ email: e })
      if (error) throw error
      // حسب إعدادات Supabase قد تحتاج تأكيد عبر رابط للميل الجديد
      setEmailMsg('تم إرسال رابط تأكيد إلى البريد الجديد. يرجى فتحه لإتمام التغيير ✉️')
    } catch (err) {
      setEmailErr(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const savePassword = async () => {
    setPwErr(''); setPwMsg('')
    if (pw.length < 8) { setPwErr('كلمة المرور يجب ألا تقل عن 8 أحرف'); return }
    if (pw !== pw2) { setPwErr('كلمتا المرور غير متطابقتين'); return }
    try {
      setPwBusy(true)
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setPwMsg('تم تحديث كلمة المرور بنجاح ✅')
      setPw(''); setPw2('')
    } catch (err) {
      setPwErr(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  if (loading) return <div className="center">جارٍ التحميل…</div>

  return (
    <Layout>
      <div className="header"><h2>الملف الشخصي</h2></div>

      {/* الاسم */}
      <div className="card" style={{marginBottom:12}}>
        <h3>البيانات الأساسية</h3>
        <div className="row" style={{marginTop:8}}>
          <div>
            <label>الاسم الكامل</label>
            <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} />
          </div>
        </div>
        {nameErr && <div style={{color:'#dc2626', marginTop:8}}>{nameErr}</div>}
        {nameMsg && <div style={{color:'#16a34a', marginTop:8}}>{nameMsg}</div>}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
          <button className="btn" onClick={saveName} disabled={nameBusy}>
            {nameBusy ? 'جارٍ الحفظ…' : 'حفظ الاسم'}
          </button>
        </div>
      </div>

      {/* الإيميل */}
      <div className="card" style={{marginBottom:12}}>
        <h3>البريد الإلكتروني</h3>
        <div className="row" style={{marginTop:8}}>
          <div>
            <label>البريد</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
        </div>
        {emailErr && <div style={{color:'#dc2626', marginTop:8}}>{emailErr}</div>}
        {emailMsg && <div style={{color:'#2563eb', marginTop:8}}>{emailMsg}</div>}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
          <button className="btn" onClick={saveEmail} disabled={emailBusy}>
            {emailBusy ? 'جارٍ الإرسال…' : 'تحديث البريد'}
          </button>
        </div>
      </div>

      {/* كلمة المرور */}
      <div className="card">
        <h3>تغيير كلمة المرور</h3>
        <div className="row" style={{marginTop:8}}>
          <div>
            <label>كلمة المرور الجديدة</label>
            <input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
          </div>
          <div>
            <label>تأكيد كلمة المرور</label>
            <input className="input" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} />
          </div>
        </div>
        {pwErr && <div style={{color:'#dc2626', marginTop:8}}>{pwErr}</div>}
        {pwMsg && <div style={{color:'#16a34a', marginTop:8}}>{pwMsg}</div>}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:10}}>
          <button className="btn" onClick={savePassword} disabled={pwBusy}>
            {pwBusy ? 'جارٍ الحفظ…' : 'تحديث كلمة المرور'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
