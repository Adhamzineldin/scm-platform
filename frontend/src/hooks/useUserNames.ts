import { useQueries } from '@tanstack/react-query'
import { getUser } from '../api/usersApi.ts'

/**
 * Resolve a list of user IDs (strings or numbers) to a `{ id -> username }` lookup map.
 * Empty / null IDs and non-numeric IDs are skipped. Falls back to the raw ID string
 * when the user can't be fetched (deleted user, network error, etc.).
 *
 * Cache key `['user', id]` is shared across pages so repeated lookups are free.
 */
export function useUserNames(rawIds: Array<string | number | null | undefined>): Record<string, string> {
  const ids = Array.from(
    new Set(
      rawIds
        .filter((v): v is string | number => v !== null && v !== undefined && v !== '')
        .map((v) => String(v))
        .filter((v) => /^\d+$/.test(v)),
    ),
  )

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['user', id],
      queryFn: () => getUser(id),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  })

  const map: Record<string, string> = {}
  ids.forEach((id, i) => {
    const data = queries[i]?.data
    if (data?.username) map[id] = data.username
  })
  return map
}

/** Convenience: resolve a single id to a display name (falls back to the id itself). */
export function displayUser(id: string | number | null | undefined, names: Record<string, string>): string {
  if (id === null || id === undefined || id === '') return '—'
  const key = String(id)
  return names[key] ?? key
}

