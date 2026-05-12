import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Users, Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
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

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  CUSTOMER: 'Customer',
  INVENTORY_MANAGER: 'Inventory Manager',
  ORDER_PROCESSING: 'Order Processing',
  WAREHOUSE_SPECIALIST: 'Warehouse Specialist',
  SHIPMENT_LEAD: 'Shipment Lead',
  CLOUD_ARCHITECT: 'Cloud Architect',
  STAFF: 'Staff',
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-200',
  CUSTOMER: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  INVENTORY_MANAGER: 'bg-sky-50 text-sky-700 ring-sky-200',
  ORDER_PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-200',
  WAREHOUSE_SPECIALIST: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SHIPMENT_LEAD: 'bg-orange-50 text-orange-700 ring-orange-200',
  CLOUD_ARCHITECT: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  STAFF: 'bg-slate-100 text-slate-600 ring-slate-200',
}

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {usersQuery.data?.totalElements ?? 0} total users · manage roles and access
          </p>
        </div>
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Activity size={15} />
          Event State
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search username, email or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-1.5"><Users size={13} />Username</span>
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Current Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="text-sm">Loading users…</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center">
                  <Users size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    {search ? `No users matching "${search}"` : 'No users found'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{u.id}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_COLOR[u.role] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={mutation.isPending}
                      onChange={(e) => mutation.mutate({ id: u.id, role: e.target.value as Role })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {(totalPages > 1 || page > 0) && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{page + 1}</span> of {totalPages}
              {usersQuery.data?.totalElements != null && (
                <span className="ml-1.5 text-slate-400">({usersQuery.data.totalElements} users)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={isLast}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
