export function formatMpesaPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

export function isValidMpesaPhone(phone: string): boolean {
  const formatted = formatMpesaPhone(phone);
  return /^254(7|1)[0-9]{8}$/.test(formatted);
}

export function generateMpesaTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'Q'; // M-Pesa Kenya transaction prefix usually starts with current letters
  const monthCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  result += monthCodes[Math.floor(Math.random() * monthCodes.length)];
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
