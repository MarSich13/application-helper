import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Layout from './components/Layout'
import { Loading, EmptyState } from './components/ui'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import VacanciesPage from './pages/VacanciesPage'
import VacancyDetailPage from './pages/VacancyDetailPage'
import ImportPage from './pages/ImportPage'
import './App.css'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="full-screen"><Loading label="Opening your workspace…" /></div>
  return <Routes>
    <Route path="/login" element={<AuthPage />} />
    <Route path="/register" element={<AuthPage register />} />
    <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
      <Route index element={<DashboardPage />} />
      <Route path="/vacancies" element={<VacanciesPage />} />
      <Route path="/applications" element={<VacanciesPage tracked />} />
      <Route path="/vacancies/:id" element={<VacancyDetailPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="*" element={<EmptyState title="A little off track" description="This page could not be found. Let's get you back to your workspace." action={<Link className="button primary" to="/">Back to overview</Link>} />} />
    </Route>
  </Routes>
}
export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
