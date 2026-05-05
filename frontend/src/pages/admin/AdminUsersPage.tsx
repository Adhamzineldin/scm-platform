import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { listUsers, updateUserRole, type AdminUser } from '../../api/adminApi.ts'
import type { Role } from '../../api/authApi.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const ROLES: Role[] = [
  'CUSTOMER',
  'STAFF',
  'ADMIN',
  'INVENTORY_MANAGER',
  'ORDER_PROCESSING',
  'WAREHOUSE_SPECIALIST',
  'SHIPMENT_LEAD',
  'CLOUD_ARCHITECT',
]

export default function AdminUsersPage() {
  const PAGE_SIZE = 15
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, PAGE_SIZE],
    queryFn: () => listUsers({ page, size: PAGE_SIZE }),
  })

  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => updateUserRole(id, role),
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update role')),
  })

  const filtered = useMemo<AdminUser[]>(() => {
    const q = search.trim().toLowerCase()
    const rows = usersQuery.data?.content ?? []
    if (!q) return rows
    return rows.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [search, usersQuery.data])

  useEffect(() => {
    setPage(0)
  }, [search])

  const totalPages = usersQuery.data?.totalPages ?? 1
  const isLast = usersQuery.data?.last ?? true

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/events"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Event State
          </Link>
          <input
            type="search"
            placeholder="Search username / email / role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">No users</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{u.id}</td>
                  <td className="px-4 py-3">{u.username}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={mutation.isPending}
                      onChange={(e) => mutation.mutate({ id: u.id, role: e.target.value as Role })}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {(totalPages > 1 || page > 0) && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Page {page + 1} of {totalPages} ({usersQuery.data?.totalElements ?? 0} users)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={isLast}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

