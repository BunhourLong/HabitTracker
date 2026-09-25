import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p className="center muted">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}
