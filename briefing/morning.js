const axios = require('axios');
const { getMonthlyTotal, getMonthlySummary } = require('../tools/expenses.js');
const logger = require('../security/logger.js');

// ── Fetch Toronto weather ─────────────────────────────────────
async function getWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=43.7001&longitude=-79.4163&current=temperature_2m,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FToronto&forecast_days=1';
    const res = await axios.get(url, { timeout: 10000 });
    const current = res.data.current;
    const daily = res.data.daily;

    const weatherCodes = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle',
      61: 'Light rain', 63: 'Rain', 71: 'Light snow', 73: 'Snow',
      80: 'Rain showers', 81: 'Rain showers', 95: 'Thunderstorm'
    };

    const condition = weatherCodes[current.weathercode] || 'Unknown';
    const temp = Math.round(current.temperature_2m);
    const high = Math.round(daily.temperature_2m_max[0]);
    const low = Math.round(daily.temperature_2m_min[0]);
    const rainChance = daily.precipitation_probability_max[0];

    // Outfit suggestion
    let outfit = '';
    if (temp < 0) outfit = 'Heavy winter coat, gloves, and boots.';
    else if (temp < 5) outfit = 'Winter coat and scarf.';
    else if (temp < 12) outfit = 'Jacket or light coat.';
    else if (temp < 18) outfit = 'Light jacket or hoodie.';
    else if (temp < 24) outfit = 'T-shirt and light layer.';
    else outfit = 'Light clothing — it\'s warm out!';

    const umbrella = rainChance > 40 ? `\n☂️ Bring an umbrella — ${rainChance}% chance of rain.` : '';

    return `🌤️ *Toronto Weather*\n${condition}, ${temp}°C (High: ${high}°C, Low: ${low}°C)\n👕 ${outfit}${umbrella}`;
  } catch (error) {
    logger.error(`Weather fetch failed: ${error.message}`);
    return '🌤️ Weather unavailable right now.';
  }
}

// ── Fetch Bible verse ─────────────────────────────────────────
async function getBibleVerse() {
  try {
    const res = await axios.get('https://bible-api.com/?random=verse');
    const verse = res.data;
    return `📖 *${verse.reference}*\n_${verse.text.trim()}_`;
  } catch (error) {
    logger.error(`Bible verse fetch failed: ${error.message}`);
    return '📖 Bible verse unavailable right now.';
  }
}

// ── Fetch news headlines ──────────────────────────────────────
async function getNews() {
  try {
    const Parser = require('rss-parser');
    const parser = new Parser({ timeout: 10000 });
    const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/rss.xml');
    const headlines = feed.items.slice(0, 3).map((item, i) => `${i + 1}. ${item.title}`).join('\n');
    return `📰 *Top Headlines*\n${headlines}`;
  } catch (error) {
    logger.error(`News fetch failed: ${error.message}`);
    return '📰 News unavailable right now.';
  }
}

// ── Get budget status ─────────────────────────────────────────
function getBudgetStatus(userId) {
  try {
    const total = getMonthlyTotal(userId);
    const summary = getMonthlySummary(userId);
    if (total === 0) return '💰 *Budget* — No expenses logged this month yet.';

    const topCategory = summary[0];
    return `💰 *Budget this month*\nTotal spent: $${total.toFixed(2)}\nTop category: ${topCategory.category} ($${topCategory.total.toFixed(2)})`;
  } catch (error) {
    return '💰 Budget data unavailable.';
  }
}

// ── Tech tip of the day ───────────────────────────────────────
const TECH_TIPS = [
  'Use `Ctrl+R` in terminal to search your command history.',
  'Run `df -h` to check disk space on all drives.',
  'SQLite WAL mode makes reads non-blocking — always use it for concurrent apps.',
  'Use `tmux` to keep terminal sessions alive after SSH disconnects.',
  'Run `htop` for a real-time view of CPU and memory usage.',
  'Use `git stash` to temporarily save uncommitted changes.',
  'Run `sudo journalctl -u service-name -f` to tail any systemd service logs.',
  'Use `rsync` instead of `cp` for large file transfers — it\'s resumable.',
  'Environment variables keep secrets out of code — never hardcode API keys.',
  'Docker volumes persist data between container restarts — use them for databases.',
];

function getTechTip() {
  const day = new Date().getDay();
  return `💡 *Daily Tip*\n${TECH_TIPS[day % TECH_TIPS.length]}`;
}

// ── Compose full morning briefing ─────────────────────────────
async function composeBriefing(userId) {
  const date = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [weather, verse, news] = await Promise.all([
    getWeather(),
    getBibleVerse(),
    getNews()
  ]);

  const budget = getBudgetStatus(userId);
  const tip = getTechTip();

  return `🌅 *Good morning, Ru!*\n_${date}_\n\n${weather}\n\n${news}\n\n${verse}\n\n${budget}\n\n${tip}`;
}

module.exports = { composeBriefing };

