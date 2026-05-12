import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, User, Camera, Loader2, AlertCircle, Shield, Mail, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyDashboard, uploadProfilePicture } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { API_BASE_URL } from '../../api/axiosInstance.ts'

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

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

export default function ProfilePage() {
  const navigate = useNavigate()
  const { userId, logout, token, username: storedUsername, role: storedRole } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMyDashboard,
    retry: 1,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setPreview(null)
      toast.success('Profile picture updated')
    },
    onError: () => {
      setPreview(null)
      toast.error('Failed to upload picture — must be an image under 5 MB')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const displayUsername = meQuery.data?.username ?? storedUsername ?? '—'
  const displayEmail = meQuery.data?.email ?? '—'
  const displayRole = meQuery.data?.role ?? storedRole ?? null
  const displayMenuItems = meQuery.data?.menuItems

  const pictureUrl = preview ?? resolveMediaUrl(meQuery.data?.profilePictureUrl)
  const isUploading = uploadMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage your account information and preferences.</p>
      </div>

      {meQuery.isError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={15} className="shrink-0" />
          Could not reach the server — showing cached info from your last login.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
              {pictureUrl ? (
                <img src={pictureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={38} />
              )}
            </div>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-indigo-600 text-white shadow-md hover:bg-indigo-700 disabled:opacity-60"
              title="Change photo"
            >
              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <p className="text-lg font-bold text-slate-900">{displayUsername}</p>
            {displayRole && (
              <span className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_COLOR[displayRole] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                {ROLE_LABELS[displayRole] ?? displayRole}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
          >
            {isUploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>

        {/* Details card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wide">Account Details</h2>
            <dl className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <User size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-slate-400">Username</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">{displayUsername}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Mail size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-slate-400">Email</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">{displayEmail}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Shield size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-slate-400">Role</dt>
                  <dd className="mt-0.5">
                    {displayRole ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_COLOR[displayRole] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        {ROLE_LABELS[displayRole] ?? displayRole}
                      </span>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Hash size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-slate-400">User ID</dt>
                  <dd className="mt-0.5 font-mono text-sm text-slate-600">{userId ?? '—'}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Menu access */}
          {displayMenuItems && displayMenuItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-wide">Your Access</h2>
              <div className="flex flex-wrap gap-2">
                {displayMenuItems.map((item) => (
                  <span key={item} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JWT debug */}
          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
              JWT (debug)
            </summary>
            <pre className="mt-3 break-all whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-[10px] text-slate-400">
              {token ?? ''}
            </pre>
          </details>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
