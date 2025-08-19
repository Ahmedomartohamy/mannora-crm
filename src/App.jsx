import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './routes/login/Login'
import ClientsList from './routes/clients/ClientsList'
import ProjectsList from './routes/projects/ProjectsList'
import UsersAdmin from './routes/admin/UsersAdmin'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/clients" replace />} />

      <Route path="/clients" element={
        <ProtectedRoute><ClientsList /></ProtectedRoute>
      } />

      <Route path="/projects" element={
        <ProtectedRoute><ProjectsList /></ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute>
          <AdminRoute>
            <UsersAdmin />
          </AdminRoute>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
