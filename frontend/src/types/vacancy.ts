export const STATUSES = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const
export type Status = typeof STATUSES[number]
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNSPECIFIED'
export type User = { id: number; email: string; displayName: string }
export type ApplicationSummary = { id: number; status: Status; version: number; statusChangedAt: string }
export type Vacancy = {
  id: number; title: string; company: string; location: string; workMode: WorkMode
  experience: string; salary: string; description: string; sourceUrl: string | null; source: string
  technologies: string[]; createdAt: string; updatedAt: string; application: ApplicationSummary | null
}
export type HistoryItem = { id: number; fromStatus: Status | null; toStatus: Status; changedAt: string }
export type Application = ApplicationSummary & {
  vacancyId: number; notes: string; createdAt: string; appliedAt: string | null
  allowedTransitions: Status[]; history: HistoryItem[]
}
export type VacancyDetail = { vacancy: Vacancy; application: Application | null }
export type PageResult<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export type Dashboard = {
  totalVacancies: number; tracked: number; active: number; appliedThisWeek: number; offers: number
  byStatus: Record<Status, number>
}
export type ImportResult = { created: number; updated: number; processed: number; vacancyIds: number[] }
export const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase()
export const modeLabel = (mode: WorkMode) => ({ REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site', UNSPECIFIED: 'Flexible' })[mode]
export const formatDate = (value: string) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
