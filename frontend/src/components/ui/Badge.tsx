type Tone = 'indigo' | 'sky' | 'amber' | 'emerald' | 'red' | 'slate' | 'violet'

const TONE_CLASSES: Record<Tone, string> = {
  indigo:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  sky:     'bg-sky-50 text-sky-700 ring-sky-200',
  amber:   'bg-amber-50 text-amber-700 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red:     'bg-red-50 text-red-700 ring-red-200',
  slate:   'bg-slate-100 text-slate-600 ring-slate-200',
  violet:  'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({ label, tone = 'slate' }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  )
}
