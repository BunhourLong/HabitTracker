import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AuthForm from './pages/AuthForm'
import Habits from './pages/Habits'

// Last line of defence: if something outside the sections crashes, show this
// instead of a blank white page.
const appFallback = () => (
  <main className="card boundary-page" role="alert">
    <h1>Something went wrong</h1>
    <p className="muted">The app hit an unexpected error. Your data is safe.</p>
    <button onClick={() => window.location.reload()}>Reload</button>
  </main>
)

export default function App() {
  return (
    <ErrorBoundary name="App" fallback={appFallback}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthForm mode="login" />} />
            <Route path="/signup" element={<AuthForm mode="signup" />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Habits />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
