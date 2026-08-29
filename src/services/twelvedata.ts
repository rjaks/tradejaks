import axios, { type AxiosError } from 'axios';
import { MarketData } from './binance';

const API_TIMEOUT_MS = 10_000;

const cache = new Map<string, { data: MarketData; expires: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache (responsive for scalping while conserving API limits)

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
  status?: string;
  code?: number;
  message?: string;
}

interface TwelveDataTimeSeriesItem {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface TwelveDataTimeSeriesResponse {
  meta?: {
    symbol: string;
    interval: string;
    currency_base: string;
    currency_quote: string;
    type: string;
  };
  values?: TwelveDataTimeSeriesItem[];
  status?: string;
  code?: number;
  message?: string;
}

function safeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosErr = error as AxiosError;
    return `AxiosError [${axiosErr.code ?? 'UNKNOWN'}] ${axiosErr.response?.status ?? 'no-status'}: ${axiosErr.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Fetches market data using Twelve Data API with intraday candles.
 */
export async function fetchTwelveDataSymbol(symbol: string, interval: string = '5min'): Promise<MarketData> {
  const cacheKey = `${symbol}_${interval}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const apiKey = process.env.TWELVE_DATA_KEY || process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('TWELVE_DATA_KEY is not defined in environment variables.');
  }

  const [quoteRes, timeSeriesRes] = await Promise.all([
    axios.get<TwelveDataQuoteResponse>(
      'https://api.twelvedata.com/quote', {
        params: { symbol, apikey: apiKey },
        timeout: API_TIMEOUT_MS,
      }
    ),
    axios.get<TwelveDataTimeSeriesResponse>(
      'https://api.twelvedata.com/time_series', {
        params: { symbol, interval, outputsize: 34, apikey: apiKey },
        timeout: API_TIMEOUT_MS,
      }
    ),
  ]);

  // Handle Twelve Data rate-limit (returned as JSON body with code 429, HTTP 200)
  if (quoteRes.data.code === 429 || timeSeriesRes.data.code === 429) {
    throw new Error('Twelve Data rate limit reached. Try again later.');
  }

  if (quoteRes.data.status === 'error' || quoteRes.data.code) {
    throw new Error(`Twelve Data Quote API error: ${quoteRes.data.message || 'Unknown error'}`);
  }

  if (timeSeriesRes.data.status === 'error' || timeSeriesRes.data.code) {
    throw new Error(
      `Twelve Data Time Series API error: ${timeSeriesRes.data.message || 'Unknown error'}`
    );
  }

  const quote = quoteRes.data;
  const values = timeSeriesRes.data.values;

  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error('Invalid response from Twelve Data: Missing or empty candle series');
  }

  // Twelve Data returns candles newest first (descending). We reverse them to oldest first.
  const sortedValues = [...values].reverse();

  const klines: { close: number; volume: number; high?: number; low?: number }[] = sortedValues.map(
    (v) => ({
      close: parseFloat(v.close),
      volume: 0, // Forex spot has no consolidated centralized volume
      high: parseFloat(v.high),
      low: parseFloat(v.low),
    })
  );

  const price = parseFloat(quote.close);
  const priceChange24h = parseFloat(quote.change);
  const priceChangePct = parseFloat(quote.percent_change);
  const high24h = parseFloat(quote.high);
  const low24h = parseFloat(quote.low);

  // Guard against NaN from unexpected API response shapes
  if (isNaN(price)) {
    throw new Error('Invalid quote data from Twelve Data: close price is NaN');
  }

  const marketData: MarketData = {
    symbol: symbol.replace(/\//g, ''),
    price,
    priceChange24h,
    priceChangePct,
    high24h,
    low24h,
    volume24h: 0,
    klines,
  };

  const expiresAt = Date.now() + CACHE_TTL_MS;
  cache.set(cacheKey, { data: marketData, expires: expiresAt });
  setTimeout(() => {
    const entry = cache.get(cacheKey);
    if (entry && Date.now() >= entry.expires) {
      cache.delete(cacheKey);
    }
  }, CACHE_TTL_MS);

  return marketData;
}

export const fetchEURUSD = (interval?: string) => fetchTwelveDataSymbol('EUR/USD', interval);

