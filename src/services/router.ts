export function getActiveSymbol(): 'BTCUSD' | 'EURUSD' {
  // Determine current day in UTC+8 (PH Time)
  const now = new Date();
  // UTC time in ms + 8 hours in ms
  const utc8Time = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000);
  const dayOfWeek = utc8Time.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend in UTC+8 -> BTCUSD, Weekday -> EURUSD
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'BTCUSD';
  }
  return 'EURUSD';
}
