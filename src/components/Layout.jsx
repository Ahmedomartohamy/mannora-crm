import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({ children }) {
  const navigate = useNavigate()

  const logout = async () => {
    try {
      // خروج محلي لتفادي 403 من الـ global
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      // حتى لو حصل خطأ، كمّل تنظيف وتوجيه
      console.error(e)
    }

    // تنظيف أي بيانات محلية ممكن ترجّع الجلسة تاني
    localStorage.clear()
    sessionStorage.clear()

    // توجيه لصفحة تسجيل الدخول
    navigate('/login', { replace: true })
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="logo">MVP CRM</div>
        <nav className="nav">
          <NavLink to="/clients" className={({isActive}) => isActive ? 'active' : ''}>العملاء</NavLink>
          <NavLink to="/projects" className={({isActive}) => isActive ? 'active' : ''}>المشاريع</NavLink>
        </nav>
        <button className="btn secondary" onClick={logout} style={{marginTop:'auto'}}>تسجيل الخروج</button>
      </aside>
      <main className="content">
        {children}
      </main>
    </div>
  )
}
