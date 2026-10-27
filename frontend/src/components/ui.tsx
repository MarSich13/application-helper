import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, LoaderCircle, X, Search } from 'lucide-react'
import type { Status } from '../types/vacancy'
import { statusLabel } from '../types/vacancy'

export function StatusBadge({ status }: { status: Status }) {
  return <span className={'status-badge status-' + status.toLowerCase()}><i />{statusLabel(status)}</span>
}
export function CompanyMark({ name, large = false }: { name: string; large?: boolean }) {
  const color = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6
  return <span aria-hidden="true" className={'company-mark brand-' + color + (large ? ' large' : '')}>{name.slice(0, 1).toUpperCase()}</span>
}
export function Loading({ label = 'Loading your workspace…' }: { label?: string }) {
  return <div className="loading-state" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-box" role="alert"><AlertCircle size={19} /><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}</div>
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Search size={27} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previous }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal-content"><div className="modal-heading"><div><p className="eyebrow">MAKE YOUR NEXT MOVE</p><h2 id="modal-title">{title}</h2></div>
      <button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>
}
