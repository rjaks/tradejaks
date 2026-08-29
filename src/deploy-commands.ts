import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Fetch the current price and indicators for a trading pair')
    .addStringOption((option) =>
      option
        .setName('symbol')
        .setDescription('Trading pair symbol — e.g. BTCUSD, EURUSD, XAUUSD, GBPUSD, or any Twelve Data forex/commodity pair')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Configure scheduled market updates')
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('Turn scheduling on or off')
        .setRequired(true)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('interval')
        .setDescription('Interval for scheduled updates')
        .setRequired(false)
        .addChoices(
          { name: '1h', value: '1h' },
          { name: '4h', value: '4h' },
          { name: 'daily', value: 'daily' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('symbols')
        .setDescription('Comma-separated symbols to post, e.g. EURUSD,XAUUSD (leave blank for auto)')
        .setRequired(false)
        .setMaxLength(100)
    ),
].map((command) => command.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing required environment variables: DISCORD_TOKEN, CLIENT_ID, or GUILD_ID.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands for guild ${guildId}.`);

    const data = (await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    )) as unknown[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
})();
