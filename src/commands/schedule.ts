import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { updateScheduler, ScheduleInterval } from '../scheduler/cron';

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

  const isActive = action === 'on';
  updateScheduler(interaction.client, isActive, interval);

  if (isActive) {
    const timeDetail = interval === 'daily' ? 'daily at 8:00 PM PH Time (UTC+8)' : `every ${interval}`;
    await interaction.reply({
      content: `✅ Scheduler turned **ON** — posting market updates **${timeDetail}**.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: '🛑 Scheduler turned **OFF** — automated market updates are disabled.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
