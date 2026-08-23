import { EmbedBuilder } from 'discord.js';
import { MarketData } from '../services/binance';
import { IndicatorResult } from '../services/indicators';

function formatCurrency(val: number, symbol?: string): string {
  // If forex (e.g. EURUSD), show up to 4 or 5 decimal places if price < 10
  if (symbol && symbol.includes('EUR') && val < 10) {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  }
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildMarketEmbed(data: MarketData, indicators: IndicatorResult): EmbedBuilder {
  const { symbol, price, priceChange24h, priceChangePct, high24h, low24h, volume24h } = data;
  const { stochRSI, ema, volumeSpike, range } = indicators;

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
    symbol.includes('EUR') && absChange < 1
      ? `${sign}$${absChange.toFixed(4)} (${sign}${absPct}%)`
      : `${sign}$${absChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${absPct}%)`;

  const changeFieldValue = `${changeEmoji} ${formattedChangeStr}`;

  // Format 24h Volume
  const volumeFieldValue =
    volume24h === 0
      ? 'N/A (Forex)'
      : volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Format 24h Range
  const rangeFieldValue = `${formatCurrency(low24h, symbol)} — ${formatCurrency(high24h, symbol)} (${range.rangePercent.toFixed(2)}%)`;

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
  const emaFieldValue = `EMA(9): ${formatCurrency(ema.emaFast, symbol)} | EMA(21): ${formatCurrency(ema.emaSlow, symbol)}  •  ${emaTrendEmoji} ${ema.trend.toUpperCase()}`;

  // Format Volume Spike info
  const volumeSpikeFieldValue = volumeSpike.isSpike
    ? `⚡ ${volumeSpike.spikeMultiplier}x avg — spike detected`
    : `Normal (${volumeSpike.spikeMultiplier}x avg)`;

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${symbol}  •  Live Market Data`)
    .setColor(embedColor)
    .addFields(
      { name: '💵 Price', value: formatCurrency(price, symbol), inline: true },
      { name: '📈 24h Change', value: changeFieldValue, inline: true },
      { name: '📦 24h Volume', value: volumeFieldValue, inline: true },
      { name: '📊 24h Range', value: rangeFieldValue, inline: false },
      { name: '⚡ Stoch RSI (14, 14, 3, 3)', value: stochRSIFieldValue, inline: false },
      { name: '📉 EMA Trend (9 / 21)', value: emaFieldValue, inline: false },
      { name: '🔊 Volume Spike', value: volumeSpikeFieldValue, inline: true }
    )
    .setFooter({ text: 'Powered by Binance & Alpha Vantage  •  PH Time (UTC+8)' })
    .setTimestamp(new Date());

  return embed;
}
