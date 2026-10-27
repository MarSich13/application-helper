import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, BriefcaseBusiness } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import type { Vacancy, PageResult } from '../types/vacancy'
import { STATUSES, statusLabel } from '../types/vacancy'
import VacancyCard from '../components/VacancyCard'
import { Loading, EmptyState, ErrorBox } from '../components/ui'

export default function VacanciesPage({ tracked = false }: { tracked?: boolean }) {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  const request = new URLSearchParams(query)
  request.set('size', '9')
  if (tracked) request.set('tracked', 'true'); else request.delete('tracked')
  const { data: result, error, retry } = useResource<PageResult<Vacancy>>('/vacancies?' + request)
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value); else next.delete(name)
    next.delete('page'); setParams(next)
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); filter('q', String(new FormData(event.currentTarget).get('q') ?? '').trim()) }
  const hasFilters = ['q', 'technology', 'location', 'workMode', 'experience', 'status'].some(key => params.has(key))
  return <>
    <div className="page-heading"><div><p className="eyebrow">{tracked ? 'EVERY STEP, IN ONE PLACE' : 'A WORLD OF POSSIBILITIES'}</p><h1>{tracked ? 'My applications' : 'Find your next chapter'}<span className="heading-dot">.</span></h1><p>{tracked ? 'Your saved roles, conversations, and next steps.' : 'Explore the roles that could become your next great move.'}</p></div><span className="section-icon"><BriefcaseBusiness size={25} /></span></div>
    <section className="filters-panel" aria-label="Filter vacancies"><form className="search-form" onSubmit={submitSearch} key={query}><Search size={19} /><input aria-label="Search vacancies" placeholder="Search job titles, companies, or keywords…" name="q" defaultValue={params.get('q') ?? ''} /><button className="button secondary" type="submit">Search</button></form>
      <div className="filter-row"><span className="filter-caption"><SlidersHorizontal size={15} />Filters</span>
        <label className="filter-field"><span className="sr-only">Work arrangement</span><select value={params.get('workMode') ?? ''} onChange={event => filter('workMode', event.target.value)}><option value="">All arrangements</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On-site</option></select></label>
        <label className="filter-field"><span className="sr-only">Experience</span><select value={params.get('experience') ?? ''} onChange={event => filter('experience', event.target.value)}><option value="">All experience levels</option><option>Junior</option><option>Middle</option><option>Senior</option></select></label>
        <label className="filter-field"><span className="sr-only">Application status</span><select value={params.get('status') ?? ''} onChange={event => filter('status', event.target.value)}><option value="">All statuses</option>{!tracked && <option value="UNTRACKED">Not tracked</option>}{STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        <label className="filter-field text-filter"><span className="sr-only">Technology</span><input aria-label="Technology" placeholder="Technology" key={'technology-' + query} defaultValue={params.get('technology') ?? ''} onBlur={event => { if (event.target.value !== (params.get('technology') ?? '')) filter('technology', event.target.value.trim()) }} onKeyDown={event => { if (event.key === 'Enter') filter('technology', event.currentTarget.value.trim()) }} /></label>
        <label className="filter-field text-filter"><span className="sr-only">Location</span><input aria-label="Location" placeholder="Location" key={'location-' + query} defaultValue={params.get('location') ?? ''} onBlur={event => { if (event.target.value !== (params.get('location') ?? '')) filter('location', event.target.value.trim()) }} onKeyDown={event => { if (event.key === 'Enter') filter('location', event.currentTarget.value.trim()) }} /></label>
        {hasFilters && <button className="reset-filters" onClick={() => setParams({})}><X size={14} />Reset</button>}</div>
    </section>
    <div className="results-toolbar"><span><strong>{result?.totalElements ?? '…'}</strong> {tracked ? 'applications' : 'opportunities'}{hasFilters ? ' matching your search' : ' to explore'}</span><label className="sort-label">Sort by<select aria-label="Sort vacancies" value={params.get('sort') ?? 'newest'} onChange={event => filter('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="company">Company name</option><option value="title">Job title</option></select></label></div>
    {error ? <ErrorBox message={error} onRetry={retry} /> : !result ? <Loading label="Finding your opportunities…" /> : result.items.length === 0 ?
      <EmptyState title={tracked && !hasFilters ? 'Your search starts here' : 'No matches this time'} description={tracked && !hasFilters ? 'Save an opportunity to start tracking your next chapter.' : 'Try a broader search, adjust your filters, or add an opportunity.'}
        action={tracked && !hasFilters ? <Link className="button primary" to="/vacancies">Explore opportunities</Link> : hasFilters ? <button className="button secondary" onClick={() => setParams({})}>Clear filters</button> : undefined} /> :
      <><div className="vacancy-grid">{result.items.map(vacancy => <VacancyCard key={vacancy.id} vacancy={vacancy} />)}</div>
        <div className="pagination"><span>Showing {result.page * result.size + 1}–{Math.min((result.page + 1) * result.size, result.totalElements)} of {result.totalElements}</span>
          <div><button className="button secondary" aria-label="Previous page" disabled={result.page === 0} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(result.page - 1)); setParams(next); window.scrollTo(0, 0) }}><ChevronLeft size={16} /></button>
            <span>Page {result.page + 1} of {result.totalPages}</span>
            <button className="button secondary" aria-label="Next page" disabled={result.page + 1 >= result.totalPages} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(result.page + 1)); setParams(next); window.scrollTo(0, 0) }}><ChevronRight size={16} /></button></div></div></>}
  </>
}
