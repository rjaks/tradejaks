import { ChatInputCommandInteraction } from 'discord.js';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ content: 'Schedule command placeholder response.' });
}
