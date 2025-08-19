import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

  // 1) لو فيه code في الـURL نبدّله بجلسة
  useEffect(() => {
    const code = params.get('code')
    const doExchange = async () => {
      setLoading(true); setError('')
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }
        // عند النقطة دي المفروض فيه session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('جلسة غير صالحة. أعد فتح رابط الدعوة.')
        setOk(true)
      } catch (e) {
        setError(e.message || 'خطأ أثناء تفعيل الدعوة')
      } finally {
        setLoading(false)
      }
    }
    doExchange()
  }, [params])

  // 2) تعيين كلمة المرور الجديدة
  const setPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('كلمة المرور يجب ألا تقل عن 8 أحرف.'); return }
    if (pw !== pw2) { setError('كلمتا المرور غير متطابقتين.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setError(error.message); return }
    // نجاح → إلى صفحة العملاء
    navigate('/clients', { replace: true })
  }

  if (loading) return <div className="center">جارٍ التحقق من الدعوة…</div>
  if (error) return (
    <div className="center">
      <div className="card" style={{width:'min(480px,92vw)'}}>
        <h3>تعذر إكمال الدعوة</h3>
        <div style={{color:'#dc2626', marginTop:8}}>{error}</div>
      </div>
    </div>
  )

  if (!ok) return null

  return (
    <div className="center">
      <form className="card" onSubmit={setPassword} style={{width:'min(480px,92vw)'}}>
        <h2 style={{marginBottom:12, textAlign:'center'}}>تعيين كلمة المرور</h2>
        <div style={{display:'grid', gap:10}}>
          <input className="input" type="password" placeholder="كلمة المرور الجديدة" value={pw} onChange={e=>setPw(e.target.value)} />
          <input className="input" type="password" placeholder="تأكيد كلمة المرور" value={pw2} onChange={e=>setPw2(e.target.value)} />
          {error && <div style={{color:'#dc2626', fontSize:14}}>{error}</div>}
          <button className="btn" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
        </div>
      </form>
    </div>
  )
}
