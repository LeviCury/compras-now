const ptBR = 'pt-BR';

export function formatUSD(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat(ptBR, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatUSDPerKg(value: number): string {
  return `${formatUSD(value, 2)}/kg`;
}

export function formatBRL(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat(ptBR, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(ptBR, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatKg(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)} kg`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(ptBR, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

const TZ = 'America/Sao_Paulo';

export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(ptBR, {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(ptBR, {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(ptBR, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function timeAgo(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'agora';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `ha ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export function minutesSince(iso: string | Date): number {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return Math.floor((Date.now() - date.getTime()) / 60000);
}
