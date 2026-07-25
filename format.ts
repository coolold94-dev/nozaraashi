export function formatMoney(value: number, currency = 'ج.م'): string {
  return `${value.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function customerTypeLabel(type: string): string {
  switch (type) {
    case 'wholesale':
      return 'جملة';
    case 'semi':
      return 'نصف جملة';
    case 'retail':
      return 'محلات';
    default:
      return '—';
  }
}

export function unitLabel(unit: string): string {
  switch (unit) {
    case 'carton':
      return 'كرتونة';
    case 'pack':
      return 'باكت';
    case 'piece':
      return 'قطعة';
    default:
      return unit;
  }
}

export function paymentTypeLabel(type: string): string {
  switch (type) {
    case 'cash':
      return 'كاش';
    case 'credit':
      return 'آجل';
    case 'partial':
      return 'جزئي';
    default:
      return type;
  }
}
