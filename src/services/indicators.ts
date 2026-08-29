import { MarketData } from './binance';

export interface StochRSIResult {
  k: number;
  d: number;
  signal: 'oversold' | 'overbought' | 'neutral';
  crossover: 'bullish_cross' | 'bearish_cross' | 'none';
}

export interface EMAResult {
  emaFast: number; // e.g. EMA 9
  emaSlow: number; // e.g. EMA 21
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface VolumeSpikeResult {
  isSpike: boolean;
  spikeMultiplier: number;
  type: 'volume' | 'volatility';
  pips?: number;
}

export interface RangeResult {
  range: number;
  rangePercent: number;
}

export interface IndicatorResult {
  stochRSI: StochRSIResult;
  ema: EMAResult;
  volumeSpike: VolumeSpikeResult;
  range: RangeResult;
}

/**
 * Standard EMA series calculation.
 */
function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length < period) {
    return [];
  }

  const k = 2 / (period + 1);
  const emaValues: number[] = [];

  // Seed with SMA of first 'period' values
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += values[i];
  }
  let prevEma = initialSum / period;
  emaValues.push(prevEma);

  for (let i = period; i < values.length; i++) {
    const currentVal = values[i];
    const currentEma = currentVal * k + prevEma * (1 - k);
    emaValues.push(currentEma);
    prevEma = currentEma;
  }

  return emaValues;
}

/**
 * Calculates Exponential Moving Average (EMA) for Fast (9) and Slow (21) periods.
 */
export function calculateEMA(klines: { close: number; volume: number }[], fastPeriod = 9, slowPeriod = 21): EMAResult {
  const closes = klines.map((c) => c.close);

  if (closes.length < slowPeriod) {
    const lastClose = closes[closes.length - 1] || 0;
    return {
      emaFast: lastClose,
      emaSlow: lastClose,
      trend: 'neutral',
    };
  }

  const fastSeries = calculateEMASeries(closes, fastPeriod);
  const slowSeries = calculateEMASeries(closes, slowPeriod);

  const rawEmaFast = fastSeries[fastSeries.length - 1];
  const rawEmaSlow = slowSeries[slowSeries.length - 1];

  // If price is small (Forex pairs < 10), keep 5 decimal places, otherwise 2 decimal places for Crypto
  const isForex = (closes[closes.length - 1] || 0) < 10;
  const multiplier = isForex ? 100000 : 100;

  const emaFast = Math.round(rawEmaFast * multiplier) / multiplier;
  const emaSlow = Math.round(rawEmaSlow * multiplier) / multiplier;

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (rawEmaFast > rawEmaSlow) {
    trend = 'bullish';
  } else if (rawEmaFast < rawEmaSlow) {
    trend = 'bearish';
  }

  return {
    emaFast,
    emaSlow,
    trend,
  };
}

/**
 * Calculates RSI values series for a given window period (default 14).
 */
function calculateRSISeries(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  const rsiSeries: number[] = [];
  const getRSI = (gain: number, loss: number) => {
    if (loss === 0) return 100;
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  };

  rsiSeries.push(getRSI(avgGain, avgLoss));

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsiSeries.push(getRSI(avgGain, avgLoss));
  }

  return rsiSeries;
}

/**
 * Calculates Stochastic RSI (%K and %D lines with crossover and overbought/oversold levels).
 * Standard parameters: RSI Length: 14, Stoch Length: 14, %K: 3, %D: 3.
 */
export function calculateStochRSI(
  klines: { close: number; volume: number }[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): StochRSIResult {
  const closes = klines.map((c) => c.close);
  const rsiValues = calculateRSISeries(closes, rsiPeriod);

  if (rsiValues.length < stochPeriod) {
    return {
      k: 50,
      d: 50,
      signal: 'neutral',
      crossover: 'none',
    };
  }

  // Calculate raw Stochastic values on RSI series
  const rawStoch: number[] = [];
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const window = rsiValues.slice(i - stochPeriod + 1, i + 1);
    const minRsi = Math.min(...window);
    const maxRsi = Math.max(...window);

    const currentRsi = rsiValues[i];
    const val = maxRsi === minRsi ? 50 : ((currentRsi - minRsi) / (maxRsi - minRsi)) * 100;
    rawStoch.push(val);
  }

  // Calculate %K (SMA of rawStoch with period kSmooth)
  const kValues: number[] = [];
  for (let i = kSmooth - 1; i < rawStoch.length; i++) {
    const window = rawStoch.slice(i - kSmooth + 1, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / kSmooth;
    kValues.push(avg);
  }

  // Calculate %D (SMA of kValues with period dSmooth)
  const dValues: number[] = [];
  for (let i = dSmooth - 1; i < kValues.length; i++) {
    const window = kValues.slice(i - dSmooth + 1, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / dSmooth;
    dValues.push(avg);
  }

  const currentK = kValues.length > 0 ? Math.round(kValues[kValues.length - 1] * 100) / 100 : 50;
  const currentD = dValues.length > 0 ? Math.round(dValues[dValues.length - 1] * 100) / 100 : 50;

  const prevK = kValues.length > 1 ? kValues[kValues.length - 2] : currentK;
  const prevD = dValues.length > 1 ? dValues[dValues.length - 2] : currentD;

  let signal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (currentK <= 20 && currentD <= 20) {
    signal = 'oversold';
  } else if (currentK >= 80 && currentD >= 80) {
    signal = 'overbought';
  }

  let crossover: 'bullish_cross' | 'bearish_cross' | 'none' = 'none';
  if (prevK <= prevD && currentK > currentD) {
    crossover = 'bullish_cross';
  } else if (prevK >= prevD && currentK < currentD) {
    crossover = 'bearish_cross';
  }

  return {
    k: currentK,
    d: currentD,
    signal,
    crossover,
  };
}

export function calculateVolumeSpike(
  klines: { close: number; volume: number; high?: number; low?: number }[]
): VolumeSpikeResult {
  if (klines.length === 0) {
    return { isSpike: false, spikeMultiplier: 0, type: 'volume' };
  }

  const last20 = klines.slice(-20);
  const totalVol = last20.reduce((acc, c) => acc + c.volume, 0);

  // If volumes are available (Crypto), compute standard volume spike
  if (totalVol > 0) {
    const avgVol = totalVol / last20.length;
    const currentVol = klines[klines.length - 1].volume;
    const isSpike = currentVol > 2 * avgVol;
    const spikeMultiplier = avgVol !== 0 ? Math.round((currentVol / avgVol) * 100) / 100 : 0;

    return {
      isSpike,
      spikeMultiplier,
      type: 'volume',
    };
  }

  // If volume is 0 (Forex), compute Pip Volatility / Candle Size surge
  const hasCandleRanges = last20.some((c) => c.high !== undefined && c.low !== undefined);
  if (hasCandleRanges) {
    // Determine pip multiplier based on price magnitude (10000 for standard forex, 100 for metals/commodities)
    const samplePrice = last20[last20.length - 1]?.close ?? 0;
    const pipMultiplier = samplePrice < 10 ? 10000 : 100;

    const candlePips = last20.map((c) => {
      const high = c.high ?? c.close;
      const low = c.low ?? c.close;
      return Math.abs(high - low) * pipMultiplier;
    });

    const totalPips = candlePips.reduce((acc, p) => acc + p, 0);
    const avgPips = totalPips / candlePips.length;
    const currentPips = Math.round(candlePips[candlePips.length - 1] * 10) / 10;

    const isSpike = avgPips > 0 ? currentPips > 1.8 * avgPips : false;
    const spikeMultiplier = avgPips > 0 ? Math.round((currentPips / avgPips) * 100) / 100 : 1;

    return {
      isSpike,
      spikeMultiplier,
      type: 'volatility',
      pips: currentPips,
    };
  }

  return {
    isSpike: false,
    spikeMultiplier: 0,
    type: 'volume',
  };
}

export function calculateRange(high24h: number, low24h: number): RangeResult {
  const range = high24h - low24h;
  const rangePercent = low24h !== 0 ? Math.round(((range / low24h) * 100) * 100) / 100 : 0;

  return {
    range: Math.round(range * 10000) / 10000,
    rangePercent,
  };
}

export function runIndicators(data: MarketData): IndicatorResult {
  const stochRSI = calculateStochRSI(data.klines);
  const ema = calculateEMA(data.klines, 9, 21);
  const volumeSpike = calculateVolumeSpike(data.klines);
  const range = calculateRange(data.high24h, data.low24h);

  return {
    stochRSI,
    ema,
    volumeSpike,
    range,
  };
}
