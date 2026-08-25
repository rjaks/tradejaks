import axios from 'axios';

const API_TIMEOUT_MS = 10_000;

export interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  klines: { close: number; volume: number; high?: number; low?: number }[]; // 34 most recent candles, oldest first
}

interface Binance24hrTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

export async function fetchBTCUSD(): Promise<MarketData> {
  try {
    const [tickerRes, klinesRes] = await Promise.all([
      axios.get<Binance24hrTicker>('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        timeout: API_TIMEOUT_MS,
      }),
      axios.get<Array<Array<string | number>>>('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=34', {
        timeout: API_TIMEOUT_MS,
      }),
    ]);

    const ticker = tickerRes.data;
    const klinesRaw = klinesRes.data;

    // index 4: close price, index 5: volume
    const klines = klinesRaw.map((kline, idx) => {
      const close = parseFloat(kline[4] as string);
      const volume = parseFloat(kline[5] as string);
      if (isNaN(close) || isNaN(volume)) {
        throw new Error(`Invalid kline data from Binance at index ${idx}: close=${kline[4]}, volume=${kline[5]}`);
      }
      return { close, volume };
    });

    const price = parseFloat(ticker.lastPrice);
    const priceChange24h = parseFloat(ticker.priceChange);
    const priceChangePct = parseFloat(ticker.priceChangePercent);
    const high24h = parseFloat(ticker.highPrice);
    const low24h = parseFloat(ticker.lowPrice);
    const volume24h = parseFloat(ticker.volume);

    if (isNaN(price)) {
      throw new Error('Invalid ticker data from Binance: lastPrice is NaN');
    }

    return {
      symbol: 'BTCUSD',
      price,
      priceChange24h,
      priceChangePct,
      high24h,
      low24h,
      volume24h,
      klines,
    };
  } catch (error) {
    // Surface rate-limit (429) or IP-ban (418) errors with a clear message
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      if (status === 429 || status === 418) {
        const retryAfter = error.response.headers['retry-after'];
        throw new Error(
          `Binance rate limit hit (HTTP ${status}). ${retryAfter ? `Retry after ${retryAfter}s.` : 'Try again later.'}`
        );
      }
    }
    throw error;
  }
}
