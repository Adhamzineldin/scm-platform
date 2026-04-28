import React, { useState } from 'react';
import { cn as clsx } from '../utils/cn';
import { CardDetails } from '../types';
import { validateCardNumber, validateCVV, validateExpiry } from '../utils/validation';
import { formatCardNumber, formatExpiry } from '../utils/formatting';

interface CardPaymentFormProps {
  amount: number;
  currency: string;
  requireCVV: boolean;
  saveCard: boolean;
  onSubmit: (data: CardDetails) => Promise<void>;
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

function CardIcon({ type }: { type: string }) {
  const map: Record<string, string> = { visa: '💳', mastercard: '💳', amex: '💳', discover: '💳' };
  if (type === 'visa') {
    return <span className="rounded bg-blue-600 px-1 py-0.5 text-[9px] font-bold tracking-widest text-white">VISA</span>;
  }
  return <span className="text-sm">{map[type] || ''}</span>;
}

function detectCardType(number: string): string {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return '';
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  requireCVV,
  saveCard,
  onSubmit,
  isProcessing,
  isDark,
}) => {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});
  const [shouldSaveCard, setShouldSaveCard] = useState(false);

  const cardType = detectCardType(cardDetails.cardNumber);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardDetails((d) => ({ ...d, cardNumber: formatted }));
    if (errors.cardNumber) setErrors((e) => ({ ...e, cardNumber: undefined }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    const [month, year] = formatted.split('/');
    setCardDetails((d) => ({ ...d, expiryMonth: month || '', expiryYear: year || '' }));
    if (errors.expiryMonth) setErrors((e) => ({ ...e, expiryMonth: undefined, expiryYear: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CardDetails, string>> = {};
    if (!validateCardNumber(cardDetails.cardNumber)) newErrors.cardNumber = 'Invalid card number';
    if (!cardDetails.cardholderName.trim()) newErrors.cardholderName = 'Name is required';
    if (!validateExpiry(cardDetails.expiryMonth, cardDetails.expiryYear)) newErrors.expiryMonth = 'Invalid expiry date';
    if (requireCVV && !validateCVV(cardDetails.cvv)) newErrors.cvv = 'Invalid CVV';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) await onSubmit(cardDetails);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card number */}
      <div>
        <FieldLabel htmlFor="pg-cardNumber" isDark={isDark}>Card number</FieldLabel>
        <div className="relative">
          <input
            id="pg-cardNumber"
            type="text"
            inputMode="numeric"
            value={cardDetails.cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            disabled={isProcessing}
            className={clsx(inputCls(!!errors.cardNumber, isDark), 'pr-12')}
          />
          {cardType && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <CardIcon type={cardType} />
            </span>
          )}
          {!cardType && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </span>
          )}
        </div>
        <FieldError message={errors.cardNumber} />
      </div>

      {/* Cardholder name */}
      <div>
        <FieldLabel htmlFor="pg-cardholderName" isDark={isDark}>Cardholder name</FieldLabel>
        <input
          id="pg-cardholderName"
          type="text"
          value={cardDetails.cardholderName}
          onChange={(e) => {
            setCardDetails((d) => ({ ...d, cardholderName: e.target.value }));
            if (errors.cardholderName) setErrors((er) => ({ ...er, cardholderName: undefined }));
          }}
          placeholder="Jane Doe"
          disabled={isProcessing}
          className={inputCls(!!errors.cardholderName, isDark)}
        />
        <FieldError message={errors.cardholderName} />
      </div>

      {/* Expiry + CVV row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="pg-expiry" isDark={isDark}>Expiry date</FieldLabel>
          <input
            id="pg-expiry"
            type="text"
            inputMode="numeric"
            value={`${cardDetails.expiryMonth}${cardDetails.expiryYear ? '/' + cardDetails.expiryYear : ''}`}
            onChange={handleExpiryChange}
            placeholder="MM / YY"
            maxLength={5}
            disabled={isProcessing}
            className={inputCls(!!errors.expiryMonth, isDark)}
          />
          <FieldError message={errors.expiryMonth} />
        </div>
        {requireCVV && (
          <div>
            <FieldLabel htmlFor="pg-cvv" isDark={isDark}>CVV</FieldLabel>
            <div className="relative">
              <input
                id="pg-cvv"
                type="password"
                inputMode="numeric"
                value={cardDetails.cvv}
                onChange={(e) => {
                  setCardDetails((d) => ({ ...d, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }));
                  if (errors.cvv) setErrors((er) => ({ ...er, cvv: undefined }));
                }}
                placeholder="•••"
                maxLength={4}
                disabled={isProcessing}
                className={clsx(inputCls(!!errors.cvv, isDark), 'pr-10')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </span>
            </div>
            <FieldError message={errors.cvv} />
          </div>
        )}
      </div>

      {/* Save card */}
      {saveCard && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={shouldSaveCard}
            onChange={(e) => setShouldSaveCard(e.target.checked)}
            disabled={isProcessing}
            className="h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <span className={clsx('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-600')}>
            Save card for future payments
          </span>
        </label>
      )}

      {/* Submit */}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Pay now
          </>
        )}
      </button>
    </form>
  );
};
