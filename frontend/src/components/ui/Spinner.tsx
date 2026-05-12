import { Loader2 } from 'lucide-react'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Loader2 size={28} className="animate-spin text-indigo-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
