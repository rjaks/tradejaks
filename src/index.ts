import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import * as priceCommand from './commands/price';
import * as scheduleCommand from './commands/schedule';
import { startScheduler } from './scheduler/cron';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Command registry pattern using Map
export interface CommandModule {
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Map<string, CommandModule>();
commands.set('price', priceCommand);
commands.set('schedule', scheduleCommand);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot online: ${readyClient.user.tag}`);
  startScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

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
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
}
