import { useEffect, useState } from 'react'
import { api, errorMessage } from '../lib/api'

export function useResource<T>(path: string) {
  const [attempt, setAttempt] = useState(0)
  const key = path + '#' + attempt
  const [result, setResult] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    api.get<T>(path, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: errorMessage(error) })
    })
    return () => controller.abort()
  }, [path, key])
  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : '',
    retry: () => setAttempt(value => value + 1),
  }
}
