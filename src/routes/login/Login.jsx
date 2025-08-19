
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="center">
      <form onSubmit={onSubmit} className="card" style={{width:'min(440px,92vw)'}}>
        <h2 style={{marginBottom:12, textAlign:'center'}}>تسجيل الدخول</h2>
        <div style={{display:'grid', gap:10}}>
          <input className="input" type="email" placeholder="البريد الإلكتروني" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <div style={{color:'#dc2626', fontSize:14}}>{error}</div>}
          <button className="btn" disabled={loading}>{loading ? 'جارٍ الدخول…' : 'دخول'}</button>
        </div>
      </form>
    </div>
  )
}
