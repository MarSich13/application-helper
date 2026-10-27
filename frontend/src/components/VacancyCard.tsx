import { ArrowUpRight, MapPin, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Vacancy } from '../types/vacancy'
import { modeLabel, formatDate } from '../types/vacancy'
import { CompanyMark, StatusBadge } from './ui'

export default function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  return <article className="vacancy-card">
    <div className="vacancy-card-top"><CompanyMark name={vacancy.company} /><span className="company-name">{vacancy.company}</span>
      {vacancy.application ? <StatusBadge status={vacancy.application.status} /> : <span className="untracked-label">Not tracked</span>}</div>
    <h3><Link to={'/vacancies/' + vacancy.id}>{vacancy.title}</Link></h3>
    <div className="vacancy-meta"><span><MapPin size={14} />{vacancy.location || 'Location not specified'}</span><span className="meta-divider" /><span>{modeLabel(vacancy.workMode)}</span></div>
    <p className="vacancy-excerpt">{vacancy.description}</p>
    <div className="technology-list">{vacancy.technologies.slice(0, 3).map(technology => <span key={technology}>{technology}</span>)}
      {vacancy.technologies.length > 3 && <span>+{vacancy.technologies.length - 3}</span>}</div>
    <div className="vacancy-card-footer"><div>{vacancy.salary ? <strong>{vacancy.salary}</strong> : <span className="muted">Salary not listed</span>}
      <span className="posted-date"><Clock3 size={12} />Added {formatDate(vacancy.createdAt)}</span></div>
      <Link className="card-open" to={'/vacancies/' + vacancy.id} aria-label={'View ' + vacancy.title + ' at ' + vacancy.company}><ArrowUpRight size={20} /></Link></div>
  </article>
}
