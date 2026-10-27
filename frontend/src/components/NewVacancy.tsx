import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, LoaderCircle } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { Vacancy } from '../types/vacancy'
import { ErrorBox, Modal } from './ui'

export default function NewVacancy({ onClose, onCreated }: { onClose: () => void; onCreated: (vacancy: Vacancy) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '').trim()
    setBusy(true); setError('')
    try {
      const vacancy = await api.post<Vacancy>('/vacancies', {
        title: field('title'), company: field('company'), location: field('location'), workMode: field('workMode'),
        experience: field('experience'), salary: field('salary'), sourceUrl: field('sourceUrl'), description: field('description'),
        technologies: [...new Set(field('technologies').split(',').map(item => item.trim()).filter(Boolean))],
      })
      onCreated(vacancy)
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <Modal title="Add an opportunity" onClose={() => { if (!busy) onClose() }}>
    <p className="modal-description">Found a role worth exploring? Keep all the details in one place.</p>
    <form onSubmit={submit} className="stack-form">
      {error && <ErrorBox message={error} />}
      <div className="form-grid"><label>Job title <span>*</span><input name="title" required maxLength={200} placeholder="e.g. Java Backend Developer" autoFocus /></label>
        <label>Company <span>*</span><input name="company" required maxLength={200} placeholder="Company name" /></label>
        <label>Location<input name="location" maxLength={200} placeholder="e.g. Berlin, Germany" /></label>
        <label>Work arrangement<select name="workMode" defaultValue="UNSPECIFIED"><option value="UNSPECIFIED">Not specified</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On-site</option></select></label>
        <label>Experience<input name="experience" maxLength={100} placeholder="e.g. Junior or Middle" /></label>
        <label>Salary<input name="salary" maxLength={200} placeholder="e.g. €50,000 – €65,000" /></label></div>
      <div className="form-field"><label htmlFor="vacancy-technologies">Technologies</label><input id="vacancy-technologies" name="technologies" aria-describedby="technology-help" placeholder="java, spring boot, postgresql" /><small id="technology-help">Separate technologies with commas. Up to 20 tags.</small></div>
      <label>Source URL<input name="sourceUrl" type="url" maxLength={2000} placeholder="https://…" /></label>
      <label>Description <span>*</span><textarea name="description" required maxLength={30000} rows={5} placeholder="Responsibilities, requirements, and what caught your eye…" /></label>
      <div className="form-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="button primary" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />}Add opportunity</button></div>
    </form>
  </Modal>
}
