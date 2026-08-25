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
import { startScheduler, stopScheduler } from './scheduler/cron';

// --- Global error handlers (must be registered before anything else) ---
process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught Exception:', err);
  process.exit(1);
});

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
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: '❌ There was an error while executing this command!',
        });
      } else {
        await interaction.reply({
          content: '❌ There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error(`Failed to send error response for ${interaction.commandName}:`, replyError);
    }
  }
});

// --- Graceful shutdown ---
function gracefulShutdown(signal: string): void {
  console.log(`\n[Shutdown] Received ${signal}. Cleaning up…`);
  stopScheduler();
  client.destroy();
  console.log('[Shutdown] Bot destroyed. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// --- Boot ---
if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set in environment variables. Exiting.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

