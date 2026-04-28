import React, { useState } from 'react';
import { cn as clsx } from '../utils/cn';
import { BankTransferDetails } from '../types';

interface BankTransferFormProps {
  amount: number;
  currency: string;
  onSubmit: (data: BankTransferDetails) => Promise<void>;
  isProcessing: boolean;
  isDark?: boolean;
}

function FieldLabel({ children, htmlFor, isDark }: { children: React.ReactNode; htmlFor: string; isDark?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx('mb-1.5 block text-xs font-semibold', isDark ? 'text-gray-300' : 'text-gray-700')}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-500">{message}</p>;
}

function inputCls(hasError: boolean, isDark?: boolean) {
  return clsx(
    'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
      : isDark
      ? 'border-white/15 bg-gray-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25'
      : 'border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
  );
}

export const BankTransferForm: React.FC<BankTransferFormProps> = ({
  onSubmit,
  isProcessing,
  isDark,
}) => {
  const [details, setDetails] = useState<BankTransferDetails>({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BankTransferDetails, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BankTransferDetails, string>> = {};
    if (!details.accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    if (!details.routingNumber.trim()) newErrors.routingNumber = 'Routing number is required';
    if (!details.accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) await onSubmit(details);
  };

  const update = (field: keyof BankTransferDetails, value: string) => {
    setDetails((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={clsx(
          'flex items-start gap-3 rounded-lg p-3 text-xs',
          isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700',
        )}
      >
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span>Bank transfers typically settle within 1–3 business days.</span>
      </div>

      <div>
        <FieldLabel htmlFor="pg-accountHolderName" isDark={isDark}>Account holder name</FieldLabel>
        <input
          id="pg-accountHolderName"
          type="text"
          value={details.accountHolderName}
          onChange={(e) => update('accountHolderName', e.target.value)}
          placeholder="Jane Doe"
          disabled={isProcessing}
          className={inputCls(!!errors.accountHolderName, isDark)}
        />
        <FieldError message={errors.accountHolderName} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="pg-accountNumber" isDark={isDark}>Account number</FieldLabel>
          <input
            id="pg-accountNumber"
            type="text"
            inputMode="numeric"
            value={details.accountNumber}
            onChange={(e) => update('accountNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="1234567890"
            disabled={isProcessing}
            className={inputCls(!!errors.accountNumber, isDark)}
          />
          <FieldError message={errors.accountNumber} />
        </div>
        <div>
          <FieldLabel htmlFor="pg-routingNumber" isDark={isDark}>Routing number</FieldLabel>
          <input
            id="pg-routingNumber"
            type="text"
            inputMode="numeric"
            value={details.routingNumber}
            onChange={(e) => update('routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="021000021"
            maxLength={9}
            disabled={isProcessing}
            className={inputCls(!!errors.routingNumber, isDark)}
          />
          <FieldError message={errors.routingNumber} />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="pg-bankName" isDark={isDark}>
          Bank name <span className={clsx('font-normal', isDark ? 'text-gray-500' : 'text-gray-400')}>(optional)</span>
        </FieldLabel>
        <input
          id="pg-bankName"
          type="text"
          value={details.bankName || ''}
          onChange={(e) => update('bankName', e.target.value)}
          placeholder="Bank of America"
          disabled={isProcessing}
          className={inputCls(false, isDark)}
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Processing…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5l9-6 9 6M3 10.5v9a.75.75 0 00.75.75H9v-4.5h6V20.25h5.25a.75.75 0 00.75-.75v-9" />
            </svg>
            Initiate transfer
          </>
        )}
      </button>
    </form>
  );
};
