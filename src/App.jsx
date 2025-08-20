import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './routes/login/Login'
import ClientsList from './routes/clients/ClientsList'
import ProjectsList from './routes/projects/ProjectsList'
import TasksList from './routes/tasks/TasksList'
import TasksBoard from './routes/tasks/TasksBoard'
import UsersAdmin from './routes/admin/UsersAdmin'
import SetPassword from './routes/auth/SetPassword'
import Profile from './routes/account/Profile'
import LeadsList from './routes/leads/LeadsList'
import LeadsBoard from './routes/leads/LeadsBoard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/" element={<Navigate to="/clients" replace />} />

      <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
      <Route path="/tasks"    element={<ProtectedRoute><TasksList /></ProtectedRoute>} />
      <Route path="/tasks/board" element={<ProtectedRoute><TasksBoard /></ProtectedRoute>} />
      <Route path="/leads"    element={<ProtectedRoute><LeadsList /></ProtectedRoute>} />
      <Route path="/leads/board" element={<ProtectedRoute><LeadsBoard /></ProtectedRoute>} />
      <Route path="/account"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="/admin/users" element={
        <ProtectedRoute><AdminRoute><UsersAdmin /></AdminRoute></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
