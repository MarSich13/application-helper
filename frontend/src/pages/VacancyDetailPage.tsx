import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MapPin, BriefcaseBusiness, Clock3, Bookmark, Check, Save, LoaderCircle, LockKeyhole, History } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { useResource } from '../hooks/useResource'
import type { VacancyDetail, Application, Status } from '../types/vacancy'
import { modeLabel, formatDate, statusLabel } from '../types/vacancy'
import { CompanyMark, StatusBadge, ErrorBox, Loading } from '../components/ui'

function VacancyDetailContent({ initial }: { initial: VacancyDetail }) {
  const id = initial.vacancy.id
  const [detail, setDetail] = useState<VacancyDetail>(initial)
  const [notes, setNotes] = useState(initial.application?.notes ?? '')
  const [selected, setSelected] = useState<Status>(initial.application?.status ?? 'SAVED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function update(application: Application) {
    setDetail(current => current ? { ...current, application, vacancy: { ...current.vacancy, application: {
      id: application.id, status: application.status, version: application.version, statusChangedAt: application.statusChangedAt,
    } } } : current)
    setSelected(application.status)
  }
  async function track() {
    setBusy(true); setError(''); setNotice('')
    try { update(await api.put<Application>('/vacancies/' + id + '/application')); setNotice('Opportunity saved to your applications.') }
    catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function saveStatus() {
    if (!detail?.application) return
    setBusy(true); setError(''); setNotice('')
    try {
      update(await api.put<Application>('/applications/' + detail.application.id + '/status', { status: selected, version: detail.application.version }))
      setNotice('Application status updated.')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function saveNotes() {
    if (!detail?.application) return
    setBusy(true); setError(''); setNotice('')
    try {
      update(await api.put<Application>('/applications/' + detail.application.id + '/notes', { notes, version: detail.application.version }))
      setNotice('Your notes have been saved.')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  const { vacancy, application } = detail
  return <>
    <Link className="back-link" to="/vacancies"><ArrowLeft size={16} />Back to opportunities</Link>
    <div className="detail-hero"><CompanyMark name={vacancy.company} large /><div><span className="detail-company">{vacancy.company}</span><h1>{vacancy.title}</h1><div className="vacancy-meta"><span><MapPin size={15} />{vacancy.location || 'Location not specified'}</span><span className="meta-divider" /><span>{modeLabel(vacancy.workMode)}</span><span className="meta-divider" /><span>{vacancy.experience || 'All experience levels'}</span></div></div></div>
    {error && <ErrorBox message={error} />}
    {notice && <div className="success-notice" role="status"><Check size={17} />{notice}</div>}
    <div className="detail-grid"><div className="detail-main">
      <section className="panel role-description"><div className="section-heading"><h2>About this opportunity</h2>{vacancy.sourceUrl && <a className="text-link" href={vacancy.sourceUrl} target="_blank" rel="noopener noreferrer">Original posting<ExternalLink size={15} /></a>}</div>
        <div className="role-facts"><div><BriefcaseBusiness size={18} /><span>EXPERIENCE<strong>{vacancy.experience || 'Not specified'}</strong></span></div><div><MapPin size={18} /><span>ARRANGEMENT<strong>{modeLabel(vacancy.workMode)}</strong></span></div><div><span className="salary-symbol">€</span><span>COMPENSATION<strong>{vacancy.salary || 'Not listed'}</strong></span></div></div>
        {vacancy.technologies.length > 0 && <div className="technology-list detail-technologies">{vacancy.technologies.map(technology => <span key={technology}>{technology}</span>)}</div>}
        <div className="description-text">{vacancy.description}</div>
        <div className="source-footer"><Clock3 size={14} /><span>Added {formatDate(vacancy.createdAt)} · Updated {formatDate(vacancy.updatedAt)}</span><span className="source-tag">{vacancy.source}</span></div>
      </section>
      {application && <section className="panel notes-panel"><div className="section-heading"><div><h2>Notes to your future self</h2><p>The details you’ll be glad you remembered.</p></div><LockKeyhole size={17} className="muted" /></div>
        <label htmlFor="application-notes" className="sr-only">Private notes</label><textarea id="application-notes" value={notes} onChange={event => { setNotes(event.target.value); setNotice('') }} maxLength={10000} rows={8} placeholder="Recruiter details, interview prep, questions to ask…" />
        <div className="notes-footer"><small>{notes.length.toLocaleString()} / 10,000 · Only visible to you</small><button className="button primary" onClick={saveNotes} disabled={busy || notes === application.notes}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Save notes</button></div></section>}
    </div><aside className="detail-aside">
      <section className="panel progress-panel"><span className="eyebrow">YOUR NEXT STEP</span><h2>Your application</h2>
        {application ? <><StatusBadge status={application.status} /><p className="progress-caption">Last updated {formatDate(application.statusChangedAt)}</p><form onSubmit={event => { event.preventDefault(); void saveStatus() }} className="stack-form">
          <label>Application status<select value={selected} onChange={event => setSelected(event.target.value as Status)} disabled={busy}><option value={application.status}>{statusLabel(application.status)}</option>{application.allowedTransitions.map(status => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label>
          <button className="button primary" disabled={busy || selected === application.status}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Update status</button></form>
          {['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(application.status) && <small className="muted">Choose Saved to reopen this opportunity. Your history stays intact.</small>}
        </> : <><p className="muted">A role worth a closer look? Save it to start tracking your progress and add private notes.</p><button className="button primary full-width" disabled={busy} onClick={track}>{busy ? <LoaderCircle size={17} className="spin" /> : <Bookmark size={17} />}Save opportunity</button></>}
        {vacancy.sourceUrl && <a className="button secondary full-width source-button" href={vacancy.sourceUrl} target="_blank" rel="noopener noreferrer">Visit original posting<ExternalLink size={15} /></a>}
      </section>
      {application && <section className="panel history-panel"><div className="section-heading"><h2>Activity timeline</h2><History size={17} className="muted" /></div><ol className="timeline">{[...application.history].reverse().map((item, index) => <li key={item.id}><span className={'timeline-dot' + (index === 0 ? ' latest' : '')} /><div><strong>{item.fromStatus ? 'Moved to ' + statusLabel(item.toStatus) : 'Saved to your applications'}</strong><time dateTime={item.changedAt}>{formatDate(item.changedAt)} · {new Date(item.changedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</time></div></li>)}</ol></section>}
      <div className="privacy-note"><LockKeyhole size={16} /><p>Vacancy details belong to the shared library. Your notes, status, and activity are private.</p></div>
    </aside></div>
  </>
}

export default function VacancyDetailPage() {
  const { id } = useParams()
  const { data, error, retry } = useResource<VacancyDetail>('/vacancies/' + id)
  if (error) return <><Link className="back-link" to="/vacancies"><ArrowLeft size={16} />Back to opportunities</Link><ErrorBox message={error} onRetry={retry} /></>
  if (!data) return <Loading label="Opening this opportunity…" />
  return <VacancyDetailContent initial={data} key={id} />
}
