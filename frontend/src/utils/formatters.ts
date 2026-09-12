import { DocumentType } from '../api/types';

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDocType(type: DocumentType): string {
  switch (type) {
    case 'passport':
      return 'Passport';
    case 'aadhaar':
      return 'Aadhaar';
    case 'pan':
      return 'PAN Card';
    default:
      return type;
  }
}

export function formatScanId(id: string): string {
  if (!id) return '';
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function formatPercentage(num: number): string {
  return `${Math.round(num * 100)}%`;
}
