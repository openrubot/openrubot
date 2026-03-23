const express = require('express');
const { getDueReminders, markDone, getUserReminders } = require('../tools/reminders.js');
const logger = require('../security/logger.js');
const { composeBriefing } = require('../briefing/morning.js');

const app = express();
app.use(express.json());

// ── Simple API key auth ───────────────────────────────────────
app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.INTERNAL_API_KEY) {
    logger.warn(`Unauthorised API request from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
});

// ── GET /api/reminders/due — returns all due reminders ────────
app.get('/api/reminders/due', (req, res) => {
  try {
    const due = getDueReminders();
    res.json({ reminders: due });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/reminders/:id/done — mark reminder as done ──────
app.post('/api/reminders/:id/done', (req, res) => {
  try {
    markDone(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/health — simple health check ─────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

function startAPI() {
  const port = process.env.API_PORT || 3001;
  app.listen(port, '0.0.0.0', () => {
    logger.info(`🌐 Internal API running on port ${port}`);
  });
}

// ── GET /api/briefing/:userId — compose morning briefing ──────
app.get('/api/briefing/:userId', async (req, res) => {
  try {
    const briefing = await composeBriefing(req.params.userId);
    res.json({ briefing });
  } catch (error) {
    logger.error(`Briefing error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { startAPI };
