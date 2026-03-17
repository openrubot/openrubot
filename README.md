<div align="center">

# 🤖 openrubot

### *Born out of boredom. Raised to be useful.*

A self-hosted, open source personal AI agent that lives on your own hardware — an old laptop at home — and connects to you through Telegram. Powered by Claude AI.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-v22-green.svg)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/platform-Telegram-blue.svg)](https://telegram.org)
[![Status](https://img.shields.io/badge/status-active%20development-orange.svg)]()

</div>

---

## What is openrubot?

openrubot is a personal AI assistant you self-host on hardware you already own. It handles your daily life — reminders, expenses, health tracking, smart lights, server monitoring, and more — all from a simple Telegram message.

Unlike SaaS alternatives costing $20–50/month per person, openrubot runs on an old laptop. Total running cost is around **$2 CAD per person per month** across 4 users.

```
You:        "remind me Friday 6pm dentist"
openrubot:  ✅ Reminder set for Friday at 6:00 PM — Dentist

You:        "spent $14 on lunch"
openrubot:  ✅ Logged $14.00 — Food & Dining

You:        "how much did I spend this month?"
openrubot:  📊 October so far: $847 across 6 categories...
```

---

## Architecture

openrubot uses a two-layer design. The bot runs on your laptop at home. Telegram handles delivery to your phone from anywhere in the world.

```
┌─────────────────────────────────────────────────────────┐
│                     YOUR PHONE                          │
│              Telegram App (anywhere)                    │
└──────────────────────┬──────────────────────────────────┘
                       │  Telegram API
┌──────────────────────▼──────────────────────────────────┐
│               🖥️  UBUNTU LAPTOP (home)                  │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │  bot.js │  │router.js │  │claude.js │  │memory  │   │
│  │Telegram │→ │ Message  │→ │Claude API│→ │SQLite  │   │
│  │Adapter  │  │ Router   │  │ Haiku /  │  │per user│   │
│  └─────────┘  └──────────┘  │ Sonnet   │  └────────┘   │
│                              └──────────┘               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tools: reminders · expenses · health · lights   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Three deployment modes** — controlled by one `.env` variable:

| Mode | Bot runs on | Data lives on | Smart home | Uptime |
|------|------------|---------------|------------|--------|
| `local` | Laptop | Laptop | ✅ | While laptop is on |
| `hybrid` | Oracle Cloud / VPS | Laptop | ✅ | 24/7 |
| `cloud` | Any VPS | VPS | ❌ | 24/7 |

---

## Features

### 🧠 AI Brain
- Claude API with smart model routing — Haiku for simple tasks, Sonnet for reasoning
- Per-user conversation memory — picks up exactly where you left off
- Natural language understanding — no commands to memorise

### ⏰ Smart Reminders
- `"remind me Friday 6pm dentist"` → done
- `"every Monday 9am standup"` → recurring reminders
- `"remind me in 30 mins to check the oven"` → relative time

### 💸 Expense Tracker
- `"spent $14 on lunch"` → auto-categorised and logged
- Send a photo of a receipt → Claude reads it and logs it
- `"how much did I spend on food this month?"` → instant summary

### 💪 Health Tracking
- `"log 7 hours sleep and 2.5L water"` → both logged at once
- Send a food photo → calorie and macro estimation
- Weekly health reports, gym streak tracking

### 🌅 Morning Briefing
- Delivered automatically every morning
- Toronto weather + outfit suggestion, top news, Bible verse, budget status, daily tech tip

### 🏠 Smart Home
- Govee smart lights via natural language: `"bedroom lights warm white 60%"`
- Reolink camera integration with Frigate NVR — human-only motion detection
- `/secure-home` away mode — records only when you're out

### 📊 Financial Intelligence
- Income tracking across multiple sources
- Savings goals — `"how far am I from my RAV4 fund?"`
- Year-end projections based on current trends

### 🔌 MCP Integrations
Connect your own services — GitHub, Google Calendar, Gmail, Notion, Slack, Spotify and more. Each user manages their own connections. Credentials are AES-256 encrypted and isolated per user.

### 📤 Exports
Export any data to Excel, Word, PDF, or live Google Sheets.

---

## Quick Start

### What you need
- An old laptop or spare PC running **Ubuntu Server 22.04/24.04 LTS**
- A [Telegram](https://telegram.org) account
- An [Anthropic API key](https://console.anthropic.com) (~$3–8 CAD/month for personal use)
- A [Tailscale](https://tailscale.com) account (free)

### Install

```bash
# Clone the repo
git clone https://github.com/openrubot/openrubot.git
cd openrubot

# Configure your environment
cp .env.example .env
nano .env  # fill in your API keys

# Install dependencies
npm install

# Start the bot
npm start
```

### Environment variables

```env
DEPLOYMENT_MODE=local          # local | hybrid | cloud
CLAUDE_API_KEY=sk-ant-...      # from console.anthropic.com
CLAUDE_MODEL_FAST=claude-haiku-4-5-20251001
CLAUDE_MODEL_SMART=claude-sonnet-4-6
TELEGRAM_BOT_TOKEN=...         # from @BotFather on Telegram
ADMIN_TELEGRAM_ID=...          # your Telegram user ID
ENCRYPTION_KEY=...             # 64-char hex: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run as a service (auto-start on boot)

```bash
sudo cp openrubot.service /etc/systemd/system/
sudo systemctl enable openrubot
sudo systemctl start openrubot
```

### Useful commands

```bash
sudo systemctl status openrubot     # check if running
sudo systemctl restart openrubot    # restart after changes
sudo journalctl -u openrubot -f     # watch live logs
```

---

## Cost breakdown

| Item | Monthly cost |
|------|-------------|
| Old laptop electricity | ~$3–5 CAD |
| Claude API (1 user, smart routing) | ~$3–4 CAD |
| Claude API (4 users, shared cache) | ~$5–8 CAD |
| Tailscale VPN | Free |
| Telegram Bot API | Free |
| **Total (1 user)** | **~$6–9 CAD** |
| **Total (4 users)** | **~$8–13 CAD** |

Compare: ChatGPT Plus for 4 people = ~$112 CAD/month.

---

## Roadmap

### ✅ Phase 1 — Environment Setup
Ubuntu server, SSH hardening, static IP, UFW, Fail2ban, Tailscale, Docker, Node.js v22

### ✅ Phase 2 — Project Setup
GitHub org, repo, folder structure, npm dependencies, .env config, Telegram bot token

### ✅ Phase 3 — Core System
AES-256 encryption, secrets-safe logger, SQLite schema, Claude API wrapper with smart routing, unified message router, Telegram adapter, systemd service — **bot is live**

### 🔄 Phase 4 — Features *(in progress)*
Smart reminders, expense tracker + receipt scanning, health tracking, morning briefing, financial intelligence, Govee smart lights, server monitoring

### ⏳ Phase 5 — Intelligence Layer
Vector memory, conversation compression, context pre-warming, proactive mode

### ⏳ Phase 6 — MCP System
Per-user encrypted integrations — GitHub, Calendar, Gmail, Notion, Slack, Spotify, OpenClaw

### ⏳ Phase 7 — Setup & Dashboard
`/setup` onboarding wizard, `/update` auto-updater, web status dashboard

### ⏳ Phase 8 — Exports
Excel, Word, PDF, Google Sheets exporters for all tracked data

### ⏳ Phase 9 — Testing & Release Prep
End-to-end tests, 4-user load test, security review across all 17 layers

### ⏳ Phase 10 — Open Source Release
Full docs, screenshots, v1.0.0 tag

---

## Contributing

openrubot is open source under Apache 2.0. Contributions are welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes — keep one feature per PR
4. Test it: `node index.js`
5. Submit a pull request with a clear description

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

**Good first contributions:**
- New MCP server connectors
- Additional expense categories
- Language support improvements
- Documentation improvements

---

## Security

openrubot is built with privacy first. All personal data stays on your own hardware — never on cloud servers.

- AES-256-GCM encryption for all stored credentials
- Per-user data isolation in SQLite
- Secrets-safe logging — API keys never appear in logs
- Whitelist-based access — unregistered users get no response
- Tailscale WireGuard VPN for all remote connections
- UFW firewall + Fail2ban on the server

See [docs/security.md](docs/security.md) for the full 17-layer security architecture.

---

## Licence

Apache 2.0 — free to use, modify, and commercialise. Attribution required.

See [LICENSE](LICENSE) for full terms.

---

<div align="center">

**🤖 openrubot** — Born out of boredom. Raised to be useful.

[github.com/openrubot/openrubot](https://github.com/openrubot/openrubot)

</div>
