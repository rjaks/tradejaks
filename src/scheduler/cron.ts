import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { getActiveSymbol } from '../services/router';
import { fetchBTCUSD, MarketData } from '../services/binance';
import { fetchEURUSD } from '../services/twelvedata';
import { runIndicators } from '../services/indicators';
import { buildMarketEmbed } from '../embeds/marketEmbed';

export type ScheduleInterval = '1h' | '4h' | 'daily';

const VALID_INTERVALS: ScheduleInterval[] = ['1h', '4h', 'daily'];

export interface ScheduleState {
  active: boolean;
  interval: ScheduleInterval;
}

const STATE_FILE_PATH = path.resolve(process.cwd(), 'schedule_state.json');
let currentTask: ScheduledTask | null = null;

const CRON_EXPRESSIONS: Record<ScheduleInterval, string> = {
  '1h': '0 * * * *',
  '4h': '0 */4 * * *',
  'daily': '0 12 * * *', // 12:00 UTC = 08:00 PM (20:00) UTC+8 (PH Time / US Market Open)
};

function readState(): ScheduleState {
  const defaultState: ScheduleState = { active: false, interval: '4h' };

  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);

      // Runtime validation — reject malformed state files
      if (typeof parsed.active !== 'boolean') return defaultState;
      if (!VALID_INTERVALS.includes(parsed.interval)) {
        parsed.interval = '4h';
      }

      return parsed as ScheduleState;
    }
  } catch (error) {
    console.error('Error reading schedule_state.json:', error);
  }
  return defaultState;
}

function writeState(state: ScheduleState): void {
  try {
    // Atomic write: write to temp file, then rename to prevent corruption on crash
    const tmpPath = STATE_FILE_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STATE_FILE_PATH);
  } catch (error) {
    console.error('Error writing schedule_state.json:', error);
  }
}

async function triggerScheduledUpdate(client: Client): Promise<void> {
  const channelId = process.env.TARGET_CHANNEL_ID;
  if (!channelId) {
    console.error('[Scheduler] TARGET_CHANNEL_ID not set in environment variables.');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error(`[Scheduler] Channel with ID ${channelId} not found or is not a text channel.`);
      return;
    }

    const symbol = getActiveSymbol();
    let data: MarketData;

    if (symbol === 'BTCUSD') {
      data = await fetchBTCUSD();
    } else {
      data = await fetchEURUSD();
    }

    const indicators = runIndicators(data);
    const embed = buildMarketEmbed(data, indicators);

    await channel.send({ embeds: [embed] });
    console.log(`[Scheduler] [${new Date().toISOString()}] Successfully sent scheduled market update for ${symbol} to channel ${channelId}`);
  } catch (error) {
    console.error(`[Scheduler] [${new Date().toISOString()}] Error during scheduled update execution:`, error);
  }
}

export function startScheduler(client: Client): void {
  const state = readState();
  if (state.active) {
    console.log(`[Scheduler] Restoring active schedule (${state.interval})...`);
    activateCron(client, state.interval);
  } else {
    console.log('[Scheduler] Scheduler is currently inactive.');
  }
}

/**
 * Stops the active cron job if one is running.
 * Called during graceful shutdown to prevent post-destroy callbacks.
 */
export function stopScheduler(): void {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('[Scheduler] Cron job stopped (shutdown).');
  }
}

function activateCron(client: Client, interval: ScheduleInterval): void {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  const cronExpression = CRON_EXPRESSIONS[interval] || CRON_EXPRESSIONS['4h'];
  currentTask = cron.schedule(cronExpression, () => {
    triggerScheduledUpdate(client).catch(console.error);
  });

  console.log(`[Scheduler] Cron scheduled with expression "${cronExpression}" (${interval}).`);
}

export function updateScheduler(
  client: Client,
  active: boolean,
  interval: ScheduleInterval = '4h'
): ScheduleState {
  const newState: ScheduleState = { active, interval };
  writeState(newState);

  if (active) {
    activateCron(client, interval);
  } else if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('[Scheduler] Cron job stopped.');
  }

  return newState;
}
