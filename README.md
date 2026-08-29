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

- **Multi-Market & Multi-Symbol Support**:
  - **Crypto**: Real-time quotes, 24h metrics, and volume via Binance API (e.g., `BTC/USDT`, `ETH/USDT`, `SOL/USDT`).
  - **Forex, Commodities & Stocks**: Real-time quotes and intraday candle data via Twelve Data API (e.g., `EUR/USD`, `GBP/USD`, `USD/JPY`, `XAU/USD`, `SPY`, `QQQ`).
- **Interactive Autocomplete**:
  - Built-in search suggestions for symbols in slash commands (`/price` and `/schedule`).
- **Smart Symbol Routing & Scheduling**:
  - Automatically alternates between `EURUSD` (weekdays) and `BTCUSD` (weekends) if no symbols are configured.
  - Supports broadcasting multiple symbols in a single scheduled embed.
- **Technical Indicators**:
  - **Stochastic RSI (14, 14, 3, 3)**: Fast `%K` and `%D` lines, Overbought (>80) / Oversold (<20) status, and Bullish/Bearish Crossover detection.
  - **EMA Trend (9 & 21)**: Exponential Moving Average price levels and Trend alignment (BULLISH / BEARISH).
  - **Volume Spike Detector**: 20-period Moving Average comparison (flags 2x+ spikes).
  - **24h Range**: High-Low volatility range and percentage calculation.
- **Automated Scheduling**: Scheduled Discord channel updates (`1h`, `4h`, or `daily` at 8:00 PM PH Time / US Open) with overlap mutex guards and error isolation.
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
   # Fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TARGET_CHANNEL_ID, TWELVE_DATA_KEY
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
| `/price` | `symbol` *(optional, with autocomplete)* | Fetch current price and indicator analysis for a specific symbol (or multiple symbols separated by comma). Defaults to active market based on day of week. |
| `/schedule` | `action` *(required: `on` \| `off`)*<br>`interval` *(optional: `1h` \| `4h` \| `daily`)*<br>`symbols` *(optional)* | Turn automated market posting ON or OFF. Configure custom intervals and specific symbols to track. Requires `Manage Server` permission. |

---

## API Limits & Caching

- Forex, Commodity, and Stock data is retrieved via Twelve Data API and cached in-memory with a **5-minute Time-To-Live (TTL)** to minimize API calls and prevent rate limits.
- Crypto data is pulled directly in real-time from Binance's public API.

---

## Credits & Attribution

- **Icon / Avatar**: The cute pup image used as the bot icon and branding was sourced from Pinterest. All rights, credits, and intellectual property for the original image belong strictly to its respective creator/owner. This project is purely non-commercial and open-source.

---

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

