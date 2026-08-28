import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { updateScheduler, ScheduleInterval } from '../scheduler/cron';
import { resolveSymbol } from '../services/router';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Check that the member has MANAGE_GUILD permission
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the **Manage Server** (`MANAGE_GUILD`) permission to configure the scheduler.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const action = interaction.options.getString('action', true) as 'on' | 'off';
  const interval = (interaction.options.getString('interval') as ScheduleInterval) || '4h';
  const symbolsRaw = interaction.options.getString('symbols');

  const validSymbols: string[] = [];
  const skippedSymbols: string[] = [];

  if (symbolsRaw) {
    const rawList = symbolsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    for (const raw of rawList) {
      const resolved = resolveSymbol(raw);
      if (resolved && resolved.source === 'twelvedata' && resolved.tdSymbol) {
        validSymbols.push(resolved.tdSymbol);
      } else {
        skippedSymbols.push(raw);
      }
    }
  }

  const isActive = action === 'on';
  updateScheduler(interaction.client, isActive, interval, validSymbols);

  if (isActive) {
    const timeDetail = interval === 'daily' ? 'daily at 8:00 PM PH Time (UTC+8)' : `every ${interval}`;
    let message = '';

    if (validSymbols.length > 0) {
      const formattedSymbols = validSymbols.map((s) => s.replace('/', '')).join(', ');
      message = `✅ Scheduler turned **ON** — posting **[${formattedSymbols}]** **${timeDetail}**.`;
    } else {
      message = `✅ Scheduler turned **ON** — posting **auto** (EURUSD weekdays / BTCUSD weekends) **${timeDetail}**.`;
    }

    if (skippedSymbols.length > 0) {
      message += `\n⚠️ Note: Skipped unsupported/crypto symbols: \`${skippedSymbols.join(', ')}\``;
    }

    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '🛑 Scheduler turned **OFF** — automated market updates are disabled.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
