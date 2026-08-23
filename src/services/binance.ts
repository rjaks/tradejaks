import axios from 'axios';

export interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  klines: { close: number; volume: number }[]; // 34 most recent 1h candles, oldest first
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
  const [tickerRes, klinesRes] = await Promise.all([
    axios.get<Binance24hrTicker>('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
    axios.get<Array<Array<string | number>>>('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=34'),
  ]);

  const ticker = tickerRes.data;
  const klinesRaw = klinesRes.data;

  // index 4: close price, index 5: volume
  const klines = klinesRaw.map((kline) => ({
    close: parseFloat(kline[4] as string),
    volume: parseFloat(kline[5] as string),
  }));

  return {
    symbol: 'BTCUSD',
    price: parseFloat(ticker.lastPrice),
    priceChange24h: parseFloat(ticker.priceChange),
    priceChangePct: parseFloat(ticker.priceChangePercent),
    high24h: parseFloat(ticker.highPrice),
    low24h: parseFloat(ticker.lowPrice),
    volume24h: parseFloat(ticker.volume),
    klines,
  };
}
