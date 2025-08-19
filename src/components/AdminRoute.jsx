import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!mounted) return
      setIsAdmin(Boolean(data) && !error)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="center">جاري التحميل…</div>
  if (!isAdmin) return <Navigate to="/clients" replace />
  return children
}
