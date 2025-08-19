
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import ProjectModal from './ProjectModal'

const STATUS_OPTIONS = ['New','In Progress','On Hold','Completed','Cancelled']

export default function ProjectsList() {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchData = async () => {
    setLoading(true); setError('')
    const [{ data: cl, error: e1 }, { data: pr, error: e2 }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('projects').select('*').order('created_at', { ascending:false }),
    ])
    setLoading(false)
    if (e1 || e2) setError((e1||e2).message)
    else { setClients(cl||[]); setItems(pr||[]) }
  }

  useEffect(() => { fetchData() }, [])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  const onDelete = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) alert(error.message); else fetchData()
  }

  const filtered = items.filter(r => {
    const ok1 = !query || (r.name||'').toLowerCase().includes(query.toLowerCase())
    const ok2 = !status || r.status === status
    return ok1 && ok2
  })

  const clientName = (id) => clients.find(c => c.id === id)?.name || '—'

  return (
    <Layout>
      <Header title="المشاريع" actions={<button className="btn" onClick={openNew}>إضافة مشروع</button>} />
      <div className="card" style={{display:'grid', gridTemplateColumns:'1fr 220px', gap:12, marginBottom:12}}>
        <input className="input" placeholder="بحث بالاسم" value={query} onChange={e=>setQuery(e.target.value)} />
        <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div>جارٍ التحميل…</div> :
          error ? <div style={{color:'#dc2626'}}>{error}</div> :
          filtered.length === 0 ? <div>لا يوجد بيانات</div> :
          <table className="table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الحالة</th>
                <th>الميزانية</th>
                <th>العميل</th>
                <th>تاريخ الإنشاء</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.status}</td>
                  <td>{Number(r.budget).toLocaleString('ar-EG')}</td>
                  <td>{clientName(r.client_id)}</td>
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
        <Modal title={editing ? 'تعديل مشروع' : 'إضافة مشروع'} onClose={()=>setModalOpen(false)}>
          <ProjectModal
            initial={editing}
            clients={clients}
            onCancel={()=>setModalOpen(false)}
            onSaved={()=>{ setModalOpen(false); fetchData() }}
          />
        </Modal>
      )}
    </Layout>
  )
}
