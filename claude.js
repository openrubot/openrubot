const Anthropic = require('@anthropic-ai/sdk');
const { getHistory, saveMessage } = require('./memory.js');
const logger = require('./security/logger.js');

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ── Models loaded from .env — update anytime without code changes
const MODELS = {
  fast:  process.env.CLAUDE_MODEL_FAST  || 'claude-haiku-4-5-20251001',
  smart: process.env.CLAUDE_MODEL_SMART || 'claude-sonnet-4-6',
};

const SYSTEM_PROMPT = `You are openrubot — a personal AI assistant living on a self-hosted server.
You help with reminders, expenses, health tracking, finances, smart home control, and daily life.
You are helpful, friendly, and concise. You remember context from previous messages.
When logging data (expenses, health, reminders), confirm what you saved clearly.
When unsure, say so honestly rather than guessing.`;

// ── Decide which model to use based on message complexity
function selectModel(message) {
  const smartTriggers = [
    'analyse', 'analyze', 'explain', 'compare', 'summarise', 'summarize',
    'report', 'calculate', 'project', 'forecast', 'review', 'describe'
  ];
  const isComplex = smartTriggers.some(t => message.toLowerCase().includes(t))
    || message.length > 300;

  const model = isComplex ? MODELS.smart : MODELS.fast;
  logger.info(`Model selected: ${model} (complex: ${isComplex})`);
  return model;
}

async function chat(userId, userMessage) {
  try {
    const history = getHistory(userId, 20);
    const model = selectModel(userMessage);

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage }
      ]
    });

    const reply = response.content[0].text;

    saveMessage(userId, 'user', userMessage);
    saveMessage(userId, 'assistant', reply);

    return reply;

  } catch (error) {
    logger.error(`Claude API error: ${error.message}`);
    return 'Sorry, I ran into an issue. Please try again in a moment.';
  }
}

module.exports = { chat, MODELS };
