import 'dotenv/config';
import { Client, GatewayIntentBits, Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import * as priceCommand from './commands/price';
import * as scheduleCommand from './commands/schedule';
import { startScheduler } from './scheduler/cron';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands: Record<string, { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }> = {
  price: priceCommand,
  schedule: scheduleCommand,
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot online: ${readyClient.user.tag}`);
  startScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands[interaction.commandName];

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  }
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
}
