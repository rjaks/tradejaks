export interface ResolvedSymbol {
  source: 'binance' | 'twelvedata';
  tdSymbol?: string;
}

export interface AutocompleteChoice {
  name: string;
  value: string;
}

export const AUTOCOMPLETE_SYMBOLS: AutocompleteChoice[] = [
  { name: 'BTC/USD (Bitcoin - Binance)', value: 'BTCUSD' },
  { name: 'EUR/USD (Euro / US Dollar)', value: 'EURUSD' },
  { name: 'XAU/USD (Gold - Commodity)', value: 'XAUUSD' },
  { name: 'GBP/USD (British Pound / US Dollar)', value: 'GBPUSD' },
  { name: 'USD/JPY (US Dollar / Japanese Yen)', value: 'USDJPY' },
  { name: 'GBP/JPY (British Pound / Japanese Yen)', value: 'GBPJPY' },
  { name: 'AUD/USD (Australian Dollar / US Dollar)', value: 'AUDUSD' },
];

export function getAutocompleteChoices(query: string): AutocompleteChoice[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return AUTOCOMPLETE_SYMBOLS.slice(0, 25);
  }

  return AUTOCOMPLETE_SYMBOLS.filter(
    (item) => item.name.toLowerCase().includes(trimmed) || item.value.toLowerCase().includes(trimmed)
  ).slice(0, 25);
}

export function resolveSymbol(raw: string): { source: 'binance' | 'twelvedata'; tdSymbol?: string } | null {
  if (!raw) return null;
  const normalized = raw.toUpperCase().trim().replace(/[^A-Z0-9/]/g, '');
  if (!normalized) return null;

  // Binance crypto
  if (['BTCUSD', 'BTCUSDT', 'BTC'].includes(normalized)) {
    return { source: 'binance' };
  }

  // Predefined Twelve Data aliases
  if (['EURUSD', 'EUR/USD', 'EUR'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'EUR/USD' };
  }
  if (['XAUUSD', 'XAU/USD', 'GOLD'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'XAU/USD' };
  }
  if (['GBPUSD', 'GBP/USD', 'GBP'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'GBP/USD' };
  }
  if (['USDJPY', 'USD/JPY', 'JPY'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'USD/JPY' };
  }
  if (['GBPJPY', 'GBP/JPY'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'GBP/JPY' };
  }
  if (['AUDUSD', 'AUD/USD', 'AUD'].includes(normalized)) {
    return { source: 'twelvedata', tdSymbol: 'AUD/USD' };
  }

  // Any string containing '/' not matched above
  if (normalized.includes('/')) {
    return { source: 'twelvedata', tdSymbol: normalized };
  }

  return null;
}

export function getActiveSymbol(): 'BTCUSD' | 'EURUSD' {
  // Determine current day in UTC+8 (PH Time)
  const now = new Date();
  // UTC time in ms + 8 hours in ms
  const utc8Time = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
  const dayOfWeek = utc8Time.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend in UTC+8 -> BTCUSD, Weekday -> EURUSD
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'BTCUSD';
  }
  return 'EURUSD';
}
