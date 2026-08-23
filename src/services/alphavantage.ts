import axios from 'axios';
import { MarketData } from './binance';

const cache = new Map<string, { data: MarketData; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ExchangeRateResponse {
  'Realtime Currency Exchange Rate'?: {
    '1. From_Currency Code': string;
    '2. From_Currency Name': string;
    '3. To_Currency Code': string;
    '4. To_Currency Name': string;
    '5. Exchange Rate': string;
    '6. Last Refreshed': string;
    '7. Time Zone': string;
    '8. Bid Price': string;
    '9. Ask Price': string;
  };
  'Note'?: string;
  'Information'?: string;
  'Error Message'?: string;
}

interface FXIntradayResponse {
  'Meta Data'?: Record<string, string>;
  'Time Series FX (60min)'?: Record<
    string,
    {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    }
  >;
  'Note'?: string;
  'Information'?: string;
  'Error Message'?: string;
}

export async function fetchEURUSD(): Promise<MarketData> {
  const cacheKey = 'EURUSD';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_KEY is not defined in environment variables.');
  }

  const [rateRes, intradayRes] = await Promise.all([
    axios.get<ExchangeRateResponse>(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${apiKey}`
    ),
    axios.get<FXIntradayResponse>(
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=EUR&to_symbol=USD&interval=60min&outputsize=compact&apikey=${apiKey}`
    ),
  ]);

  if (rateRes.data['Error Message'] || intradayRes.data['Error Message']) {
    throw new Error(
      rateRes.data['Error Message'] || intradayRes.data['Error Message'] || 'Alpha Vantage API error'
    );
  }

  if (rateRes.data['Note'] || intradayRes.data['Note']) {
    throw new Error(
      rateRes.data['Note'] || intradayRes.data['Note'] || 'Alpha Vantage API call frequency limit reached.'
    );
  }

  const exchangeRateData = rateRes.data['Realtime Currency Exchange Rate'];
  const timeSeries = intradayRes.data['Time Series FX (60min)'];

  if (!timeSeries) {
    throw new Error('Invalid response from Alpha Vantage: Missing Time Series FX (60min)');
  }

  // Sort timestamps descending, take 34 most recent, reverse to oldest-first
  const sortedTimestamps = Object.keys(timeSeries).sort((a, b) => (a > b ? -1 : 1));
  const recent34Timestamps = sortedTimestamps.slice(0, 34).reverse();

  const klines: { close: number; volume: number }[] = recent34Timestamps.map((ts) => ({
    close: parseFloat(timeSeries[ts]['4. close']),
    volume: 0,
  }));

  // Derive high24h, low24h, priceChange24h, priceChangePct from last 24 entries (oldest to newest among the 24)
  const last24Entries = klines.slice(-24);

  let high24h = -Infinity;
  let low24h = Infinity;

  for (const candle of last24Entries) {
    if (candle.close > high24h) high24h = candle.close;
    if (candle.close < low24h) low24h = candle.close;
  }

  // Current price from Realtime Exchange Rate or latest close
  const currentPrice = exchangeRateData
    ? parseFloat(exchangeRateData['5. Exchange Rate'])
    : (klines.length > 0 ? klines[klines.length - 1].close : 0);

  const oldest24Close = last24Entries.length > 0 ? last24Entries[0].close : currentPrice;
  const priceChange24h = currentPrice - oldest24Close;
  const priceChangePct = oldest24Close !== 0 ? (priceChange24h / oldest24Close) * 100 : 0;

  const data: MarketData = {
    symbol: 'EURUSD',
    price: currentPrice,
    priceChange24h,
    priceChangePct,
    high24h: high24h === -Infinity ? currentPrice : high24h,
    low24h: low24h === Infinity ? currentPrice : low24h,
    volume24h: 0,
    klines,
  };

  cache.set(cacheKey, {
    data,
    expires: Date.now() + CACHE_TTL_MS,
  });

  return data;
}
