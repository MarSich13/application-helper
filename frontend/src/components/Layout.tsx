import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, LayoutDashboard, Layers, Upload, Plus, ArrowUpRight, LogOut } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import NewVacancy from './NewVacancy'
import { errorMessage } from '../lib/api'
import { ErrorBox } from './ui'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const title = location.pathname === '/' ? 'Overview' : location.pathname.startsWith('/import') ? 'Import opportunities' :
    location.pathname.startsWith('/applications') ? 'My applications' : location.pathname === '/vacancies' ? 'Opportunities' : 'Opportunity details'
  async function logout() {
    setLoggingOut(true); setError('')
    try { await signOut(); navigate('/login') } catch (error) { setError(errorMessage(error)) } finally { setLoggingOut(false) }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <NavLink to="/" className="brand"><span className="brand-symbol"><BriefcaseBusiness size={22} /></span><span>application<span className="brand-light">helper</span><small>YOUR NEXT CHAPTER</small></span></NavLink>
      <div className="workspace-label"><span className="workspace-dot" />Personal workspace</div>
      <p className="nav-section-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        <NavLink to="/" end><LayoutDashboard size={18} />Overview</NavLink>
        <NavLink to="/vacancies"><BriefcaseBusiness size={18} />Opportunities</NavLink>
        <NavLink to="/applications"><Layers size={18} />My applications</NavLink>
        <NavLink to="/import"><Upload size={18} />Import vacancies</NavLink>
      </nav>
      <div className="sidebar-note"><span className="note-spark">✦</span><h3>A little progress,<br />every day.</h3><p>Your next opportunity starts with a small step.</p><button onClick={() => navigate('/vacancies')}>Find your next role <ArrowUpRight size={16} /></button></div>
      <div className="sidebar-footer"><span className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user?.displayName}</strong><small>Personal account</small></div>
        <button className="icon-button logout-button" aria-label="Sign out" disabled={loggingOut} onClick={logout}><LogOut size={17} /></button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Workspace<span>/</span><strong>{title}</strong></div><div className="topbar-actions"><span className="private-label"><span />Private notes & progress</span>
        <button className="button primary" aria-label="Add opportunity" onClick={() => setCreating(true)}><Plus size={17} /><span>Add opportunity</span></button>
        <button className="icon-button mobile-signout" aria-label="Sign out" disabled={loggingOut} onClick={logout}><LogOut size={18} /></button></div></header>
      <main id="main-content" className="main-content">{error && <ErrorBox message={error} />}<Outlet context={{ openNew: () => setCreating(true) }} /></main>
      <footer className="workspace-footer"><span>A clearer view of what comes next.</span><span>Application Helper <span className="footer-dot">·</span> Made for your next move</span></footer>
    </div>
    {creating && <NewVacancy onClose={() => setCreating(false)} onCreated={vacancy => { setCreating(false); navigate('/vacancies/' + vacancy.id) }} />}
  </div>
}
