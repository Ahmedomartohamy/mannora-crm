import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!mounted) return
      setIsAdmin(Boolean(data) && !error)
    })
    return () => { mounted = false }
  }, [])

  const logout = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }) } catch (e) { console.error(e) }
    localStorage.clear(); sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="logo">MVP CRM</div>
        <nav className="nav">
          <NavLink to="/clients" className={({isActive}) => isActive ? 'active' : ''}>العملاء</NavLink>
          <NavLink to="/projects" className={({isActive}) => isActive ? 'active' : ''}>المشاريع</NavLink>
          <NavLink to="/leads"    className={({isActive}) => isActive ? 'active' : ''}>العملاء المحتملون</NavLink>
          <NavLink to="/tasks"    className={({isActive}) => isActive ? 'active' : ''}>المهام</NavLink>
          <NavLink to="/account"  className={({isActive}) => isActive ? 'active' : ''}>الملف الشخصي</NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={({isActive}) => isActive ? 'active' : ''}>إدارة المستخدمين</NavLink>
          )}
        </nav>
        <button className="btn secondary" onClick={logout} style={{marginTop:'auto'}}>تسجيل الخروج</button>
      </aside>
      <main className="content">
        {children}
      </main>
    </div>
  )
}
