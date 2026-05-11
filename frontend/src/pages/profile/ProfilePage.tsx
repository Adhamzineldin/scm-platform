import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, User, Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getMyDashboard, uploadProfilePicture } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { API_BASE_URL } from '../../api/axiosInstance.ts'

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { userId, logout, token } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMyDashboard,
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
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pictureUrl = preview ?? resolveMediaUrl(meQuery.data?.profilePictureUrl)
  const isUploading = uploadMutation.isPending

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={36} />
              )}
            </div>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              title="Change profile picture"
            >
              {isUploading
                ? <Loader2 size={13} className="animate-spin" />
                : <Camera size={13} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 truncate">
              {meQuery.data?.username ?? '—'}
            </div>
            <div className="text-sm text-slate-500 truncate">{meQuery.data?.email ?? '—'}</div>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 text-xs text-indigo-600 hover:underline disabled:opacity-50"
            >
              {isUploading ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
        </div>

        <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{meQuery.data?.role ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">User ID</dt>
            <dd className="font-mono text-xs text-slate-700">{userId ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Menu items</dt>
            <dd className="text-right text-slate-700">
              {meQuery.data?.menuItems?.join(', ') ?? '—'}
            </dd>
          </div>
        </dl>

        <details className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer text-slate-600">JWT (debug)</summary>
          <pre className="mt-2 break-all whitespace-pre-wrap font-mono text-[10px] text-slate-500">
            {token ?? ''}
          </pre>
        </details>

        <button
          onClick={handleLogout}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )
}
