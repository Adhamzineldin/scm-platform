# @aether/payment-gateway

A reusable, customizable payment gateway component for React applications.

## Features

- ✅ **Multiple Payment Methods**: Cards, Bank Transfers, Digital Wallets (Apple Pay, Google Pay), QR Codes
- ✅ **Type-Safe**: Written in TypeScript
- ✅ **Customizable**: Themes, colors, and styling options
- ✅ **Secure**: PCI-compliant with tokenization
- ✅ **Framework-Agnostic**: Works with any React project
- ✅ **Test Mode**: Sandbox environment for development

## Installation

```bash
npm install @aether/payment-gateway
# or
yarn add @aether/payment-gateway
```

## Usage

### Basic Example

```tsx
import { PaymentGateway } from '@aether/payment-gateway';

function CheckoutPage() {
  const handleSuccess = (result) => {
    console.log('Payment successful:', result.transactionId);
  };

  const handleError = (error) => {
    console.error('Payment failed:', error.message);
  };

  return (
    <PaymentGateway
      amount={99.99}
      currency="USD"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### Advanced Example

```tsx
<PaymentGateway
  amount={1000}
  currency="USD"
  methods={['card', 'apple_pay', 'google_pay', 'bank_transfer', 'qr_code']}
  theme="modern"
  primaryColor="#2563eb"
  recurring={true}
  recurringInterval="monthly"
  saveCard={true}
  sandbox={true}
  onSuccess={handleSuccess}
  onError={handleError}
  onCancel={() => console.log('Payment cancelled')}
  onMethodChange={(method) => console.log('Method changed:', method)}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `amount` | number | ✅ | - | Payment amount |
| `currency` | string | ✅ | - | Currency code (USD, EUR, etc.) |
| `onSuccess` | function | ✅ | - | Called on successful payment |
| `onError` | function | ✅ | - | Called on payment failure |
| `methods` | array | ❌ | `['card', 'bank_transfer']` | Available payment methods |
| `theme` | string | ❌ | `'modern'` | UI theme (light, dark, modern, minimal) |
| `primaryColor` | string | ❌ | `'#2563eb'` | Primary color |
| `recurring` | boolean | ❌ | `false` | Enable recurring payments |
| `recurringInterval` | string | ❌ | - | Interval (daily, weekly, monthly, yearly) |
| `saveCard` | boolean | ❌ | `false` | Allow saving cards |
| `requireCVV` | boolean | ❌ | `true` | Require CVV input |
| `sandbox` | boolean | ❌ | `false` | Test mode |
| `onCancel` | function | ❌ | - | Called when payment is cancelled |
| `onMethodChange` | function | ❌ | - | Called when payment method changes |

## Supported Payment Methods

### Card Payments
- Visa
- Mastercard
- American Express
- Discover

### Digital Wallets
- Apple Pay
- Google Pay

### Bank Transfers
- ACH transfers
- Wire transfers

### QR Code Payments
- Mobile banking apps

## Themes

### Light Theme
```tsx
<PaymentGateway theme="light" />
```

### Dark Theme
```tsx
<PaymentGateway theme="dark" />
```

### Modern Theme (Default)
```tsx
<PaymentGateway theme="modern" />
```

### Custom Theme
```tsx
<PaymentGateway 
  theme="modern" 
  primaryColor="#10b981" 
/>
```

## Test Mode

Enable sandbox mode for testing:

```tsx
<PaymentGateway
  sandbox={true}
  amount={100}
  currency="USD"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

In test mode:
- No real payments are processed
- 90% success rate for testing
- Faster processing time
- "Test Mode" badge displayed

## Backend Integration

The payment gateway needs a backend API endpoint:

```tsx
// Example backend integration
const processPayment = async (paymentData) => {
  const response = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return response.json();
};
```

## Security

- ✅ PCI DSS compliant
- ✅ Card data tokenization
- ✅ No sensitive data stored on client
- ✅ SSL/TLS encryption required
- ✅ 3D Secure support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

