import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, ArrowRight, Check, LoaderCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { api, errorMessage } from '../lib/api'
import { ErrorBox } from '../components/ui'

export default function AuthPage({ register = false }: { register?: boolean }) {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    api.get<{ demoEnabled: boolean }>('/auth/config', controller.signal).then(config => setDemo(config.demoEnabled)).catch(() => {})
    return () => controller.abort()
  }, [])
  if (user) return <Navigate to="/" replace />
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      if (register) await api.post('/auth/register', { email, password, displayName: name })
      await signIn(email, password); navigate('/')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-story">
    <Link to="/login" className="brand"><span className="brand-symbol"><BriefcaseBusiness size={24} /></span><span>application<span className="brand-light">helper</span></span></Link>
    <div className="auth-story-content"><span className="auth-kicker"><Sparkles size={16} />A LITTLE CLARITY GOES A LONG WAY</span>
      <h1>Your next chapter.<br /><em>All in one place.</em></h1><p>A calmer way to find opportunities, follow your applications, and keep moving forward.</p>
      <ul>{['Every opportunity, thoughtfully organized', 'Your notes and progress, always private', 'Import updates without losing your place'].map(item => <li key={item}><Check size={17} />{item}</li>)}</ul>
      <div className="auth-illustration" aria-hidden="true"><div className="illustration-orbit orbit-one" /><div className="illustration-orbit orbit-two" /><div className="illustration-card"><span className="illustration-logo">N</span><div><strong>Your next opportunity</strong><span>A place to do your best work</span></div><span className="illustration-check"><Check size={18} /></span></div><div className="illustration-tag"><span />One step closer</div></div>
    </div><p className="auth-story-footer">Built for the journey. And the destination.</p>
  </div><div className="auth-form-side"><div className="auth-form-wrap"><span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
    <h2>{register ? 'Start your next chapter' : 'Welcome back.'}</h2><p className="auth-subtitle">{register ? 'Make a little room for your next big move.' : 'Let’s make your next move a little clearer.'}</p>
    <form onSubmit={submit} className="stack-form" key={register ? 'register' : 'login'}>
      {error && <ErrorBox message={error} />}
      {register && <label>Full name<input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name" placeholder="Alex Morgan" /></label>}
      <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={register ? 10 : undefined} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 10 characters' : 'Enter your password'} /></label>
      {register && <small className="muted">Choose a password with 10–72 characters to protect your account.</small>}
      <button className="button primary auth-submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : null}{register ? 'Create account' : 'Sign in'}<ArrowRight size={18} /></button>
    </form>
    <p className="auth-switch">{register ? 'Already have an account?' : 'New here?'} <Link onClick={() => setError('')} to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
    {demo && !register && <div className="demo-box"><span className="demo-label"><span />EXPLORE THE DEMO</span><p>Take a look around with a ready-to-use workspace.</p><button type="button" className="button secondary" disabled={busy} onClick={() => { setEmail('demo@example.com'); setPassword('DemoPassword123!'); setError('') }}>Fill demo credentials<ArrowUpRightIcon /></button><small>Fictional vacancies. Public demo account.</small></div>}
    <p className="auth-bottom">Less scattered tabs. More possibilities.</p>
  </div></div></div>
}
function ArrowUpRightIcon() { return <ArrowRight size={16} /> }
