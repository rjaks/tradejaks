import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getActiveSymbol } from '../services/router';
import { fetchBTCUSD, MarketData } from '../services/binance';
import { fetchEURUSD } from '../services/twelvedata';
import { runIndicators } from '../services/indicators';
import { buildMarketEmbed } from '../embeds/marketEmbed';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const rawSymbol = interaction.options.getString('symbol');
    const symbol = rawSymbol ? rawSymbol.toUpperCase().trim() : getActiveSymbol();

    let data: MarketData;

    if (symbol === 'BTCUSD' || symbol === 'BTCUSDT' || symbol === 'BTC') {
      data = await fetchBTCUSD();
    } else if (symbol === 'EURUSD' || symbol === 'EUR') {
      data = await fetchEURUSD();
    } else {
      const unknownEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Unknown Symbol')
        .setDescription(
          `Invalid symbol \`${rawSymbol}\`.\n\n**Valid options:**\n• \`BTCUSD\` (or \`BTC\`)\n• \`EURUSD\` (or \`EUR\`)`
        )
        .setTimestamp(new Date());

      await interaction.editReply({ embeds: [unknownEmbed] });
      return;
    }

    const indicators = runIndicators(data);
    const embed = buildMarketEmbed(data, indicators);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /price command:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('❌ Fetch Error')
      .setDescription(`Failed to retrieve market data: \`${errorMessage}\``)
      .setTimestamp(new Date());

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
