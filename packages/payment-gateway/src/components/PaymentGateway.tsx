import React, { useState } from 'react';
import { cn as clsx } from '../utils/cn';
import { PaymentGatewayProps, PaymentResult } from '../types';
import { CardPaymentForm } from './CardPaymentForm';
import { BankTransferForm } from './BankTransferForm';
import { DigitalWalletButton } from './DigitalWalletButton';
import { QRCodePayment } from './QRCodePayment';

type Method = 'card' | 'bank_transfer' | 'apple_pay' | 'google_pay' | 'qr_code';

const METHOD_LABELS: Record<Method, string> = {
  card: 'Card',
  bank_transfer: 'Bank transfer',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  qr_code: 'QR code',
};

const METHOD_ICONS: Record<Method, React.ReactNode> = {
  card: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  bank_transfer: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
  apple_pay: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.22 1.31-2.2 3.91.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.62zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  google_pay: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm-2.07-13.16c-.45 0-.86.17-1.18.45L6.58 9.1c.7-.64 1.62-1.02 2.63-1.02 1.12 0 2.08.43 2.8 1.13l-1.44 1.44c-.34-.34-.82-.55-1.34-.55l-.3.01v.73h.3zm2.14 7.68L9.93 16.4c.31.27.71.44 1.14.44.58 0 1.1-.26 1.44-.68l1.45 1.45c-.72.7-1.69 1.12-2.77 1.12-1.04 0-1.98-.4-2.68-1.06l2.14-2.14.3.04z"/>
    </svg>
  ),
  qr_code: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  ),
};

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  currency,
  onSuccess,
  onError,
  merchantId,
  orderId,
  methods = ['card', 'bank_transfer'],
  recurring = false,
  recurringInterval,
  theme = 'modern',
  locale = 'en-US',
  saveCard = false,
  requireCVV = true,
  sandbox = false,
  onCancel,
  onMethodChange,
  processor,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<Method>((methods[0] as Method) || 'card');
  const [isProcessing, setIsProcessing] = useState(false);

  const isDark = theme === 'dark';

  const handleMethodSelect = (method: Method) => {
    setSelectedMethod(method);
    onMethodChange?.(method);
  };

  const processPayment = async (paymentData: unknown) => {
    setIsProcessing(true);
    try {
      let result: PaymentResult;
      if (processor) {
        result = await processor({
          method: selectedMethod,
          card: paymentData as Parameters<typeof processor>[0]['card'],
          bank: paymentData as Parameters<typeof processor>[0]['bank'],
          amount,
          currency,
          orderId,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, sandbox ? 1200 : 2000));
        const isSuccess = sandbox ? Math.random() > 0.1 : true;
        if (!isSuccess) throw new Error('Payment declined');
        result = {
          success: true,
          transactionId: `TXN-${Date.now()}`,
          message: 'Payment processed successfully',
          timestamp: new Date(),
        };
      }
      if (result.success) onSuccess(result);
      else throw new Error(result.message || 'Payment failed');
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedAmount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);

  return (
    <div
      className={clsx(
        'w-full rounded-xl border font-sans text-sm antialiased',
        isDark
          ? 'border-white/10 bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-900',
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-start justify-between gap-4 border-b px-6 py-5',
          isDark ? 'border-white/10' : 'border-gray-100',
        )}
      >
        <div>
          <p className={clsx('text-xs font-medium uppercase tracking-wider', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Amount due
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{formattedAmount}</span>
            {recurring && recurringInterval && (
              <span className={clsx('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                / {recurringInterval}
              </span>
            )}
          </div>
        </div>
        {sandbox && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Test mode
          </span>
        )}
      </div>

      {/* Method tabs */}
      {methods.length > 1 && (
        <div
          className={clsx(
            'flex gap-1 overflow-x-auto border-b px-4 py-3',
            isDark ? 'border-white/10' : 'border-gray-100',
          )}
        >
          {(methods as Method[]).map((m) => (
            <button
              key={m}
              disabled={isProcessing}
              onClick={() => handleMethodSelect(m)}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                selectedMethod === m
                  ? 'bg-primary-600 text-white shadow-sm'
                  : isDark
                  ? 'text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40',
              )}
            >
              {METHOD_ICONS[m]}
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {/* Form area */}
      <div className="px-6 py-5">
        {selectedMethod === 'card' && (
          <CardPaymentForm
            amount={amount}
            currency={currency}
            requireCVV={requireCVV}
            saveCard={saveCard}
            onSubmit={processPayment}
            isProcessing={isProcessing}
            isDark={isDark}
          />
        )}
        {selectedMethod === 'bank_transfer' && (
          <BankTransferForm
            amount={amount}
            currency={currency}
            onSubmit={processPayment}
            isProcessing={isProcessing}
            isDark={isDark}
          />
        )}
        {(selectedMethod === 'apple_pay' || selectedMethod === 'google_pay') && (
          <DigitalWalletButton
            type={selectedMethod}
            amount={amount}
            currency={currency}
            locale={locale}
            onSubmit={processPayment}
            isProcessing={isProcessing}
            isDark={isDark}
          />
        )}
        {selectedMethod === 'qr_code' && (
          <QRCodePayment
            amount={amount}
            currency={currency}
            locale={locale}
            orderId={orderId || `ORDER-${Date.now()}`}
            onComplete={processPayment}
            isDark={isDark}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className={clsx(
          'flex items-center justify-between border-t px-6 py-3',
          isDark ? 'border-white/10' : 'border-gray-100',
        )}
      >
        <span className={clsx('flex items-center gap-1.5 text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Secured with 256-bit SSL
        </span>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40',
              isDark
                ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentGateway;
