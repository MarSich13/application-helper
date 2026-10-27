import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileJson, ArrowRight, Download, Check, ShieldCheck, RefreshCw, LoaderCircle } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import type { ImportResult } from '../types/vacancy'
import { ErrorBox } from '../components/ui'

export default function ImportPage() {
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const input = useRef<HTMLInputElement>(null)
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setResult(null)
    if (file.size > 2 * 1024 * 1024) { setError('Choose a JSON file smaller than 2 MB.'); return }
    try { setText(await file.text()); setFilename(file.name) } catch { setError('Unable to read this file. Please try again.') }
  }
  async function example() {
    setError(''); setResult(null)
    try {
      const response = await fetch('/samples/vacancies.initial.json')
      if (!response.ok) throw new Error()
      setText(await response.text()); setFilename('vacancies.initial.json')
    } catch { setError('Unable to load the example file. Please try again.') }
  }
  async function submit() {
    setError(''); setResult(null)
    if (new TextEncoder().encode(text).byteLength > 2 * 1024 * 1024) { setError('Use JSON smaller than 2 MB.'); return }
    let payload: unknown
    try {
      payload = JSON.parse(text)
      if (!payload || typeof payload !== 'object' || !('source' in payload) || !('vacancies' in payload) || !Array.isArray(payload.vacancies))
        throw new Error()
    } catch { setError('Use valid JSON with a source and a vacancies array. Download the example to see the format.'); return }
    setBusy(true)
    try { setResult(await api.post<ImportResult>('/imports', payload)) }
    catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">BRING YOUR POSSIBILITIES TOGETHER</p><h1>A fresh start. A familiar place.</h1><p>Bring vacancies into your library and keep the details up to date.</p></div><span className="section-icon"><Upload size={25} /></span></div>
    <div className="import-layout"><section className="panel import-main"><div className="section-heading"><div><h2>Import vacancies</h2><p>Upload a JSON file or paste its contents below.</p></div><span className="file-label">JSON</span></div>
      {error && <ErrorBox message={error} />}
      {result && <div className="import-success" role="status"><span className="import-check"><Check size={22} /></span><div><h3>Your library is up to date</h3><p><strong>{result.created}</strong> new · <strong>{result.updated}</strong> updated · {result.processed} processed</p><Link to={'/vacancies/' + result.vacancyIds[0]}>Open imported opportunity<ArrowRight size={15} /></Link></div></div>}
      <input className="sr-only" type="file" accept=".json,application/json" ref={input} onChange={choose} aria-label="Choose JSON import file" disabled={busy} />
      <button className="upload-zone" disabled={busy} onClick={() => input.current?.click()}><span className="upload-icon"><FileJson size={27} /></span><strong>{filename || 'Choose a JSON file'}</strong><span>Up to 500 vacancies · file size up to 2 MB</span><span className="button secondary">Browse files</span></button>
      <div className="import-divider"><span />or paste your JSON<span /></div>
      <label className="json-label" htmlFor="import-json">Vacancy data</label><textarea id="import-json" className="json-editor" value={text} maxLength={2 * 1024 * 1024} onChange={event => { setText(event.target.value); setFilename(''); setResult(null) }} rows={12} spellCheck={false} placeholder={'{\n  "source": "my-job-board",\n  "vacancies": [ ... ]\n}'} />
      <div className="import-actions"><button className="text-link" disabled={busy} onClick={example}><FileJson size={16} />Load example</button><button className="button primary" disabled={busy || !text.trim()} onClick={submit}>{busy ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}{busy ? 'Importing…' : 'Import vacancies'}</button></div>
    </section><aside className="import-help"><section className="panel"><span className="eyebrow">GOOD TO KNOW</span><h2>A little less busywork.</h2><div className="import-feature"><span><RefreshCw size={20} /></span><div><h3>Updates, without duplicates</h3><p>Keep the same source and external ID when refreshing an existing opportunity.</p></div></div><div className="import-feature"><span><ShieldCheck size={20} /></span><div><h3>Your progress stays with you</h3><p>Updated descriptions keep your application status, notes, and activity history.</p></div></div><div className="import-feature"><span><Check size={20} /></span><div><h3>All together, or try again</h3><p>If any item is invalid, the whole import is cancelled. Fix the file and retry.</p></div></div>
      <a className="button secondary full-width" href="/samples/vacancies.initial.json" download><Download size={16} />Download example</a></section>
      <div className="import-tip"><span className="note-spark">✦</span><h3>Try the update workflow</h3><p>Import the example, save a role, add a note, then import the updated file. Your progress will still be there.</p><a className="text-link" href="/samples/vacancies.updated.json" download>Get the updated example<Download size={15} /></a></div></aside></div>
  </>
}
