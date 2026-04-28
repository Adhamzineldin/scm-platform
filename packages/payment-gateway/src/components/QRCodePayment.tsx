import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn as clsx } from '../utils/cn';

interface QRCodePaymentProps {
  amount: number;
  currency: string;
  locale?: string;
  orderId: string;
  onComplete: (data: unknown) => Promise<void>;
  isDark?: boolean;
}

type Status = 'pending' | 'scanning' | 'completed';

/** Deterministic pixel grid derived from the payment string so it doesn't
 *  flicker on re-render while still looking like a real QR code. */
function buildQrGrid(seed: string): boolean[] {
  const size = 11;
  const cells = size * size;
  const result: boolean[] = [];
  for (let i = 0; i < cells; i++) {
    const ch = seed.charCodeAt(i % seed.length);
    result.push((ch * (i + 1) * 37) % 100 > 42);
  }
  // Force corner finder patterns to be filled for realism
  const corners = [0, 1, 2, size, size * 2, size * 3, size - 3, size - 2, size - 1];
  corners.forEach((c) => { result[c] = true; });
  return result;
}

export const QRCodePayment: React.FC<QRCodePaymentProps> = ({
  amount,
  currency,
  locale = 'en-US',
  orderId,
  onComplete,
  isDark,
}) => {
  const [status, setStatus] = useState<Status>('pending');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const seed = useMemo(() => `PAYMENT:${orderId}:${amount}:${currency}`, [orderId, amount, currency]);
  const qrGrid = useMemo(() => buildQrGrid(seed), [seed]);
  const formattedAmount = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (completedRef.current) return;
      const rand = Math.random();
      if (rand > 0.85) {
        setStatus('scanning');
        setTimeout(() => {
          if (completedRef.current) return;
          completedRef.current = true;
          setStatus('completed');
          clearInterval(timerRef.current!);
          onComplete({ orderId, amount, currency });
        }, 1500);
      }
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [orderId, amount, currency, onComplete]);

  const statusConfig: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Waiting for scan…',
      cls: isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500',
      icon: (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ),
    },
    scanning: {
      label: 'Scan detected — confirm in your app',
      cls: 'bg-blue-50 text-blue-700',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-6 3H6" />
        </svg>
      ),
    },
    completed: {
      label: 'Payment received!',
      cls: 'bg-green-50 text-green-700',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
    },
  };

  const { label, cls, icon } = statusConfig[status];

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="text-center">
        <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
          Scan to pay {formattedAmount}
        </p>
        <p className={clsx('mt-0.5 text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
          Use your mobile banking app to scan this code
        </p>
      </div>

      {/* QR code visual */}
      <div
        className={clsx(
          'relative rounded-2xl p-4 shadow-md',
          status === 'completed' ? 'opacity-40 grayscale' : '',
          isDark ? 'bg-white' : 'bg-white border border-gray-200',
        )}
      >
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(11, 1fr)', width: 176, height: 176 }}>
          {qrGrid.map((filled, i) => (
            <div
              key={i}
              className="rounded-[1px]"
              style={{ background: filled ? '#111827' : '#fff' }}
            />
          ))}
        </div>
        {status === 'completed' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={clsx('w-full rounded-lg p-3 text-xs', isDark ? 'bg-gray-800' : 'bg-gray-50')}>
        <div className={clsx('flex justify-between py-1.5', isDark ? 'border-b border-white/10' : 'border-b border-gray-200')}>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Amount</span>
          <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{formattedAmount}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Order ID</span>
          <span className={clsx('font-mono', isDark ? 'text-white' : 'text-gray-900')}>{orderId.slice(0, 20)}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className={clsx('flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold', cls)}>
        {icon}
        {label}
      </div>
    </div>
  );
};
