import { EmbedBuilder } from 'discord.js';
import { MarketData } from '../services/binance';
import { IndicatorResult } from '../services/indicators';

function formatCurrency(val: number, refPrice?: number): string {
  const p = refPrice ?? val;
  if (p < 10) {
    // Small forex (EUR/USD, GBP/USD, AUD/USD)
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  }
  if (p < 500) {
    // Mid-range: USD/JPY (~150), GBP/JPY (~195) — 2 decimal places
    // Note: XAU/USD (~2600) falls through to the large-price branch below, which also uses 2dp
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Crypto / large prices
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildMarketEmbed(data: MarketData, indicators: IndicatorResult): EmbedBuilder {
  const { symbol, price, priceChange24h, priceChangePct, high24h, low24h, volume24h } = data;
  const { stochRSI, ema, volumeSpike, range } = indicators;

  // Guard: reject NaN data before building user-facing embed
  if (isNaN(price) || isNaN(high24h) || isNaN(low24h)) {
    throw new Error(`Cannot build embed: received NaN market data for ${symbol}`);
  }

  // Determine embed color
  // Priority: StochRSI signal overrides price direction
  let embedColor: number;
  if (stochRSI.signal === 'oversold') {
    embedColor = 0x00ff88; // Bright green
  } else if (stochRSI.signal === 'overbought') {
    embedColor = 0xff4444; // Bright red
  } else if (priceChange24h > 0) {
    embedColor = 0x22c55e; // Green
  } else if (priceChange24h < 0) {
    embedColor = 0xef4444; // Red
  } else {
    embedColor = 0x94a3b8; // Slate gray
  }

  // Format 24h Change
  const isPositiveChange = priceChange24h >= 0;
  const changeEmoji = isPositiveChange ? '🟢' : '🔴';
  const sign = isPositiveChange ? '+' : '-';
  const absChange = Math.abs(priceChange24h);
  const absPct = Math.abs(priceChangePct).toFixed(2);

  const formattedChangeStr =
    absChange < 1 && price < 10
      ? `${sign}$${absChange.toFixed(4)} (${sign}${absPct}%)`
      : `${sign}$${absChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${absPct}%)`;

  const changeFieldValue = `${changeEmoji} ${formattedChangeStr}`;

  // Format 24h Volume
  const volumeFieldValue =
    volume24h === 0
      ? 'N/A (Forex)'
      : volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Format 24h Range
  const rangeFieldValue = `${formatCurrency(low24h, price)} — ${formatCurrency(high24h, price)} (${range.rangePercent.toFixed(2)}%)`;

  // Format Stoch RSI info
  let stochSignalText = 'Neutral ⚪';
  if (stochRSI.signal === 'oversold') {
    stochSignalText = 'Oversold 🟢';
  } else if (stochRSI.signal === 'overbought') {
    stochSignalText = 'Overbought 🔴';
  }

  let crossInfo = '';
  if (stochRSI.crossover === 'bullish_cross') {
    crossInfo = ' • 🚀 Bullish Cross';
  } else if (stochRSI.crossover === 'bearish_cross') {
    crossInfo = ' • 🔻 Bearish Cross';
  }

  const stochRSIFieldValue = `K: ${stochRSI.k.toFixed(1)} | D: ${stochRSI.d.toFixed(1)}  •  ${stochSignalText}${crossInfo}`;

  // Format EMA info
  const emaTrendEmoji = ema.trend === 'bullish' ? '🟢' : ema.trend === 'bearish' ? '🔴' : '⚪';
  const emaFieldValue = `EMA(9): ${formatCurrency(ema.emaFast, price)} | EMA(21): ${formatCurrency(ema.emaSlow, price)}  •  ${emaTrendEmoji} ${ema.trend.toUpperCase()}`;

  // Format Activity / Volatility / Volume Spike info
  let activityFieldName = '🔊 Volume Spike';
  let activityFieldValue = '';

  if (volumeSpike.type === 'volatility') {
    const label = price < 10 ? '🔊 Pip Volatility (5m)' : '🔊 Point Volatility (5m)';
    activityFieldName = label;
    const unit = price < 10 ? 'pips' : 'pts';
    const pipStr = volumeSpike.pips !== undefined ? `${volumeSpike.pips} ${unit} • ` : '';
    activityFieldValue = volumeSpike.isSpike
      ? `⚡ ${pipStr}${volumeSpike.spikeMultiplier}x avg — volatility surge`
      : `Normal (${pipStr}${volumeSpike.spikeMultiplier}x avg)`;
  } else {
    activityFieldValue = volumeSpike.isSpike
      ? `⚡ ${volumeSpike.spikeMultiplier}x avg — spike detected`
      : `Normal (${volumeSpike.spikeMultiplier}x avg)`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${symbol}  •  Live Market Data`)
    .setColor(embedColor)
    .addFields(
      { name: '💵 Price', value: formatCurrency(price, price), inline: true },
      { name: '📈 24h Change', value: changeFieldValue, inline: true },
      { name: '📦 24h Volume', value: volumeFieldValue, inline: true },
      { name: '📊 24h Range', value: rangeFieldValue, inline: false },
      { name: '⚡ Stoch RSI (14, 14, 3, 3)', value: stochRSIFieldValue, inline: false },
      { name: '📉 EMA Trend (9 / 21)', value: emaFieldValue, inline: false },
      { name: activityFieldName, value: activityFieldValue, inline: true }
    )
    .setFooter({ text: 'Powered by Binance & Twelve Data  •  PH Time (UTC+8)' })
    .setTimestamp(new Date());

  return embed;
}
