import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, BriefcaseBusiness, Layers, MessageSquare, Sparkles, Plus, Upload, Compass } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useWorkspace } from '../components/useWorkspace'
import { useResource } from '../hooks/useResource'
import type { Dashboard, Vacancy, PageResult } from '../types/vacancy'
import { STATUSES, statusLabel } from '../types/vacancy'
import VacancyCard from '../components/VacancyCard'
import { ErrorBox, Loading, EmptyState } from '../components/ui'

export default function DashboardPage() {
  const { user } = useAuth()
  const { openNew } = useWorkspace()
  const { data, error: dashboardError, retry: retryDashboard } = useResource<Dashboard>('/dashboard')
  const { data: recentPage, error: recentError, retry: retryRecent } = useResource<PageResult<Vacancy>>('/vacancies?size=4')
  const recent = recentPage?.items ?? []
  const error = dashboardError || recentError
  const [today] = useState(() => new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date()))
  const name = user?.displayName.split(' ')[0] ?? 'there'
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR JOB SEARCH, IN FOCUS</p><h1>You’ve got this, {name}<span className="heading-spark">✦</span></h1><p>A little clarity for your next big move. Here’s where things stand.</p></div>
      <span className="date-label">{today}</span></div>
    {error ? <ErrorBox message={error} onRetry={() => { retryDashboard(); retryRecent() }} /> : !data || !recentPage ? <Loading /> : <>
      <div className="metric-grid">{[
        { label: 'Tracked opportunities', value: data.tracked, caption: 'All your possibilities', icon: BriefcaseBusiness, tone: 'green' },
        { label: 'Active applications', value: data.active, caption: 'Your next move is in motion', icon: Layers, tone: 'blue' },
        { label: 'Interview stage', value: data.byStatus.INTERVIEW, caption: 'Conversations worth preparing for', icon: MessageSquare, tone: 'purple' },
        { label: 'Offers & accepted', value: data.offers, caption: 'Something to feel good about', icon: Sparkles, tone: 'orange' },
      ].map(({ label, value, caption, icon: Icon, tone }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className={'metric-icon ' + tone}><Icon size={19} /></span></div><strong className="metric-value">{value}<span className="metric-unit">roles</span></strong><p>{caption}</p></article>)}</div>
      <div className="dashboard-middle"><section className="panel pipeline-panel"><div className="section-heading"><div><h2>Your application pipeline</h2><p>Every small step adds up.</p></div><Link className="text-link" to="/applications">View all<ArrowUpRight size={16} /></Link></div>
        <div className="pipeline-total"><strong>{data.tracked}</strong><span>opportunities on your radar</span></div>
        <div className="pipeline-bar" aria-hidden="true">{STATUSES.filter(status => data.byStatus[status] > 0).map(status => <span className={'bar-' + status.toLowerCase()} key={status} style={{ flexGrow: data.byStatus[status] }} />)}{data.tracked === 0 && <span className="bar-empty" />}</div>
        <div className="pipeline-legend">{STATUSES.map(status => <Link to={'/applications?status=' + status} key={status}><span className={'legend-dot bar-' + status.toLowerCase()} /><span>{statusLabel(status)}</span><strong>{data.byStatus[status]}</strong></Link>)}</div>
      </section><section className="momentum-panel"><span className="momentum-icon"><Compass size={27} /></span><span className="eyebrow">SMALL STEPS. REAL PROGRESS.</span><h2>Your next chapter<br />is taking shape.</h2><p>You’ve sent <strong>{data.appliedThisWeek} application{data.appliedThisWeek === 1 ? '' : 's'}</strong> in the last seven days. Keep the momentum going.</p><Link to="/vacancies" className="button light">Explore opportunities<ArrowRight size={17} /></Link><div className="momentum-decoration" aria-hidden="true">↗</div></section></div>
      <section className="recent-section"><div className="section-heading"><div><span className="eyebrow">ROOM FOR SOMETHING NEW</span><h2>Fresh opportunities</h2><p>A few recent additions to your shared opportunity library.</p></div><Link className="text-link" to="/vacancies">Browse all {data.totalVacancies} roles<ArrowUpRight size={16} /></Link></div>
        {recent.length ? <div className="vacancy-grid">{recent.map(vacancy => <VacancyCard key={vacancy.id} vacancy={vacancy} />)}</div> : <EmptyState title="A fresh start" description="Add your first opportunity or import vacancies to build your library." action={<button className="button primary" onClick={openNew}><Plus size={17} />Add an opportunity</button>} />}</section>
      <section className="quick-actions"><div><span className="quick-icon"><Plus size={20} /></span><div><h3>Found something interesting?</h3><p>Give that open browser tab a proper home.</p></div><button className="text-link" onClick={openNew}>Add a role<ArrowRight size={17} /></button></div><div><span className="quick-icon"><Upload size={20} /></span><div><h3>Bring your opportunities along</h3><p>Import a collection and keep it up to date.</p></div><Link className="text-link" to="/import">Import vacancies<ArrowRight size={17} /></Link></div></section>
    </>}
  </>
}
