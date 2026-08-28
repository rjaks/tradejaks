import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getActiveSymbol, resolveSymbol } from '../services/router';
import { fetchBTCUSD, MarketData } from '../services/binance';
import { fetchTwelveDataSymbol } from '../services/twelvedata';
import { runIndicators } from '../services/indicators';
import { buildMarketEmbed } from '../embeds/marketEmbed';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const rawSymbol = interaction.options.getString('symbol');
    // Sanitise: uppercase, trim, clamp length, strip non-alpha characters
    const sanitised = rawSymbol ? rawSymbol.toUpperCase().trim().slice(0, 10).replace(/[^A-Z0-9/]/g, '') : null;
    const symbol = sanitised || getActiveSymbol();

    const resolved = resolveSymbol(symbol);

    if (!resolved) {
      const unknownEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Unknown Symbol')
        .setDescription(
          `Invalid symbol \`${sanitised}\`.\n\n**Valid options:**\n• \`BTCUSD\` (or \`BTC\`)\n• \`EURUSD\` (or \`EUR\`)\n• \`XAUUSD\` (or \`GOLD\` / \`XAU\`)\n• \`GBPUSD\` (or \`GBP\`)\n• \`USDJPY\` (or \`JPY\`)\n• \`AUDUSD\` (or \`AUD\`)\n• Any Twelve Data forex/commodity pair (e.g. \`GBP/JPY\`)`
        )
        .setTimestamp(new Date());

      await interaction.editReply({ embeds: [unknownEmbed] });
      return;
    }

    let data: MarketData;

    if (resolved.source === 'binance') {
      data = await fetchBTCUSD();
    } else {
      data = await fetchTwelveDataSymbol(resolved.tdSymbol!);
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

    try {
      await interaction.editReply({ embeds: [errorEmbed] });
    } catch (replyError) {
      console.error('Failed to send error embed for /price:', replyError);
    }
  }
}
