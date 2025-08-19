import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // وضع الشاشة: login أو reset
  const [mode, setMode] = useState('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [resetErr, setResetErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/clients', { replace: true })
    })
  }, [navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/clients', { replace: true })
  }

  const onReset = async (e) => {
    e.preventDefault()
    setResetErr('')
    setResetMsg('')
    const targetEmail = (resetEmail || email).trim()
    if (!targetEmail) {
      setResetErr('من فضلك أدخل بريدك الإلكتروني.')
      return
    }
    try {
      setResetLoading(true)
      // يرسل بريد استرجاع بكود يعيد التوجيه لصفحة /set-password عندك (لوكال/فيرسل حسب الدومين الحالي)
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/set-password`
      })
      setResetLoading(false)
      if (error) setResetErr(error.message)
      else setResetMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك ✉️')
    } catch (err) {
      setResetLoading(false)
      setResetErr(err.message)
    }
  }

  const goLogin = () => {
    setMode('login')
    setResetErr('')
    setResetMsg('')
  }

  return (
    <div className="center">
      <div className="card" style={{width:'min(440px,92vw)'}}>
        {mode === 'login' ? (
          <form onSubmit={onSubmit}>
            <h2 style={{marginBottom:12, textAlign:'center'}}>تسجيل الدخول</h2>
            <div style={{display:'grid', gap:10}}>
              <input
                className="input"
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
              />
              {error && <div style={{color:'#dc2626', fontSize:14}}>{error}</div>}
              <button className="btn" disabled={loading}>
                {loading ? 'جارٍ الدخول…' : 'دخول'}
              </button>
              <div style={{textAlign:'center', marginTop:8}}>
                <span className="link" onClick={()=>{ setMode('reset'); setResetEmail(email); }}>
                  نسيت كلمة المرور؟
                </span>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={onReset}>
            <h2 style={{marginBottom:12, textAlign:'center'}}>استرجاع كلمة المرور</h2>
            <div style={{display:'grid', gap:10}}>
              <input
                className="input"
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                value={resetEmail}
                onChange={e=>setResetEmail(e.target.value)}
              />
              {resetErr && <div style={{color:'#dc2626', fontSize:14}}>{resetErr}</div>}
              {resetMsg && <div style={{color:'#16a34a', fontSize:14}}>{resetMsg}</div>}
              <button className="btn" disabled={resetLoading}>
                {resetLoading ? 'جارٍ الإرسال…' : 'إرسال رابط إعادة التعيين'}
              </button>
              <div style={{textAlign:'center', marginTop:8}}>
                <span className="link" onClick={goLogin}>رجوع لتسجيل الدخول</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
