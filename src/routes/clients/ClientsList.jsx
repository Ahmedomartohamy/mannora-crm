
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import ClientModal from './ClientModal'

export default function ClientsList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchData = async () => {
    setLoading(True=>true)
    setError('')
    let req = supabase.from('clients').select('*').order('created_at', { ascending:false })
    const { data, error } = await req
    setLoading(false)
    if (error) setError(error.message)
    else setItems(data || [])
  }

  useEffect(() => { fetchData() }, [])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  const onDelete = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) alert(error.message); else fetchData()
  }

  const filtered = items.filter(r => {
    if (!query) return true
    const q = query.toLowerCase()
    return (r.name||'').toLowerCase().includes(q) || (r.email||'').toLowerCase().includes(q) || (r.company||'').toLowerCase().includes(q)
  })

  return (
    <Layout>
      <Header title="العملاء" actions={<button className="btn" onClick={openNew}>إضافة عميل</button>} />
      <div className="card" style={{marginBottom:12}}>
        <input className="input" placeholder="بحث بالاسم / البريد / الشركة" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div>جارٍ التحميل…</div> :
          error ? <div style={{color:'#dc2626'}}>{error}</div> :
          filtered.length === 0 ? <div>لا يوجد بيانات</div> :
          <table className="table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الهاتف</th>
                <th>الشركة</th>
                <th>تاريخ الإنشاء</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.email||'—'}</td>
                  <td>{r.phone||'—'}</td>
                  <td>{r.company||'—'}</td>
                  <td>{new Date(r.created_at).toLocaleString('ar')}</td>
                  <td>
                    <span className="link" onClick={()=>openEdit(r)}>تعديل</span>
                    {' | '}
                    <span className="link" onClick={()=>onDelete(r.id)} style={{color:'#dc2626'}}>حذف</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {modalOpen && (
        <Modal title={editing ? 'تعديل عميل' : 'إضافة عميل'} onClose={()=>setModalOpen(false)}>
          <ClientModal
            initial={editing}
            onCancel={()=>setModalOpen(false)}
            onSaved={()=>{ setModalOpen(false); fetchData() }}
          />
        </Modal>
      )}
    </Layout>
  )
}
