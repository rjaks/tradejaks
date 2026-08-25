<p align="center">
  <img src="./assets/banner.png" alt="Tradejaks Banner" width="100%" />
</p>

<p align="center">
  <strong>smol pup, big leverage.</strong><br>
  Your real-time trading signals & market analysis Discord bot.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node Version" />
  <img src="https://img.shields.io/badge/typescript-v5-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2.svg" alt="Discord.js" />
</p>

---

## Features

- **Multi-Market Support**:
  - **Crypto (`BTCUSD`)**: Direct real-time quotes, 24h metrics, and volume via Binance API.
  - **Forex (`EURUSD`)**: Real-time quotes and 5-minute intraday candle data (optimized for scalp/momentum trading) via Twelve Data API.
- **Smart Symbol Routing**: Automatically serves `BTCUSD` on weekends and `EURUSD` on weekdays (PH Time UTC+8) if no symbol is specified.
- **Technical Indicators**:
  - **Stochastic RSI (14, 14, 3, 3)**: Fast `%K` and `%D` lines, Overbought (>80) / Oversold (<20) status, and Bullish/Bearish Crossover detection.
  - **EMA Trend (9 & 21)**: Exponential Moving Average price levels and Trend alignment (BULLISH / BEARISH).
  - **Volume Spike Detector**: 20-period Moving Average comparison (flags 2x+ spikes).
  - **24h Range**: High-Low volatility range and percentage calculation.
- **Automated Scheduling**: Scheduled Discord channel updates (`1h`, `4h`, or `daily` at 8:00 PM PH Time / US Open) using persistent cron jobs.
- **Color-Coded Rich Embeds**: Dynamic Discord card styling based on technical indicators and price momentum.

---

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Discord Bot Token | From Discord Developer Portal -> Bot -> Reset Token |
| `CLIENT_ID` | Discord Application / Client ID | From Discord Developer Portal -> General Information |
| `GUILD_ID` | Discord Server (Guild) ID | Right-click your server -> Copy Server ID |
| `TARGET_CHANNEL_ID` | Target Channel ID for scheduled updates | Right-click the target text channel -> Copy Channel ID |
| `TWELVE_DATA_KEY` | Twelve Data API Key | Free key from [twelvedata.com](https://twelvedata.com) |

---

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tradejaks
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TARGET_CHANNEL_ID, ALPHA_VANTAGE_KEY
   ```

4. **Deploy Slash Commands to Discord**:
   ```bash
   npm run deploy
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## Available Slash Commands

| Command | Options | Description |
| :--- | :--- | :--- |
| `/price` | `symbol` *(optional)* | Fetch current price and indicator analysis for `BTCUSD` or `EURUSD`. Defaults to active market based on day of week. |
| `/schedule` | `action` *(required: `on` \| `off`)*<br>`interval` *(optional: `1h` \| `4h` \| `daily`)* | Turn automated market posting ON or OFF. Requires `Manage Server` permission. Default interval is `4h` (`daily` posts at 8:00 PM UTC+8). |

---

## Alpha Vantage Free Tier Limits & Caching

- Alpha Vantage free tier is limited to **25 requests per day** and **5 requests per minute**.
- To prevent rate-limiting, `EURUSD` responses are automatically cached in-memory with a **5-minute Time-To-Live (TTL)**.
- Consecutive requests within 5 minutes are served instantly from cache.
