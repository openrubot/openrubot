const axios = require('axios');
const logger = require('../security/logger.js');

const BASE_URL = 'https://openapi.api.govee.com/router/api/v1';
const DEVICE = '14:17:DB:48:43:86:1C:7C';
const SKU = 'H60B0';
const TOTAL_SEGMENTS = 15;

// ── Colour map ────────────────────────────────────────────────
const COLORS = {
  red:        16711680,
  green:      65280,
  blue:       255,
  white:      16777215,
  yellow:     16776960,
  orange:     16744192,
  purple:     8388736,
  pink:       16711935,
  cyan:       65535,
  warm:       16752384,
  warmwhite:  16752384,
  cool:       11393254,
  coolwhite:  11393254,
  teal:       32896,
  lavender:   9699539,
  mint:       4456448,
};

function colorNameToRgb(name) {
  const key = name.toLowerCase().replace(/\s+/g, '');
  return COLORS[key] ?? COLORS.white;
}

// ── Send a control command ────────────────────────────────────
async function sendCommand(capability, instance, value) {
  try {
    const res = await axios.post(`${BASE_URL}/device/control`, {
      requestId: `openrubot-${Date.now()}`,
      payload: {
        sku: SKU,
        device: DEVICE,
        capability: { type: capability, instance, value }
      }
    }, {
      headers: {
        'Govee-API-Key': process.env.GOVEE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    logger.info(`Govee command sent: ${instance} = ${JSON.stringify(value)}`);
    return res.data;
  } catch (error) {
    logger.error(`Govee command failed: ${error.message}`);
    return null;
  }
}

// ── Whole lamp controls ───────────────────────────────────────
async function setPower(on) {
  return sendCommand('devices.capabilities.on_off', 'powerSwitch', on ? 1 : 0);
}

async function setBrightness(percent) {
  const value = Math.max(1, Math.min(100, Math.round(percent)));
  return sendCommand('devices.capabilities.range', 'brightness', value);
}

async function setColor(colorName) {
  const rgb = colorNameToRgb(colorName);
  return sendCommand('devices.capabilities.color_setting', 'colorRgb', rgb);
}

async function setColorTemp(kelvin) {
  const value = Math.max(2700, Math.min(6500, kelvin));
  return sendCommand('devices.capabilities.color_setting', 'colorTemperatureK', value);
}

// ── Segmented controls ────────────────────────────────────────
// segments: array of segment indices (0-14), or null for all
async function setSegmentColor(colorName, segments = null) {
  const rgb = colorNameToRgb(colorName);
  const segs = segments ?? Array.from({ length: TOTAL_SEGMENTS }, (_, i) => i);
  return sendCommand('devices.capabilities.segment_color_setting', 'segmentedColorRgb', {
    segment: segs,
    rgb
  });
}

async function setSegmentBrightness(percent, segments = null) {
  const brightness = Math.max(0, Math.min(100, Math.round(percent)));
  const segs = segments ?? Array.from({ length: TOTAL_SEGMENTS }, (_, i) => i);
  return sendCommand('devices.capabilities.segment_color_setting', 'segmentedBrightness', {
    segment: segs,
    brightness
  });
}

// ── Music mode ────────────────────────────────────────────────
const MUSIC_MODES = {
  'diy': 0, 'stippling': 1, 'hopping': 2,
  'flowing': 3, 'luminous': 4, 'sprouting': 5,
  'rhythm': 6, 'shiny': 7
};

async function setMusicMode(modeName, sensitivity = 50) {
  const mode = MUSIC_MODES[modeName.toLowerCase()] ?? 6;
  return sendCommand('devices.capabilities.music_setting', 'musicMode', {
    musicMode: mode,
    sensitivity,
    autoColor: 1
  });
}

// ── Execute parsed natural language command ───────────────────
async function executeCommand(parsed) {
  const { power, color, brightness, colorTemp, segments, musicMode } = parsed;
  const results = [];

  if (power === 'on')  results.push(await setPower(true));
  if (power === 'off') { results.push(await setPower(false)); return results; }

  if (musicMode) results.push(await setMusicMode(musicMode));

  if (segments && segments.length > 0) {
    // Segmented mode — specific parts of the lamp
    if (color)      results.push(await setSegmentColor(color, segments));
    if (brightness) results.push(await setSegmentBrightness(brightness, segments));
  } else {
    // Whole lamp mode
    if (colorTemp)  results.push(await setColorTemp(colorTemp));
    if (color)      results.push(await setColor(color));
    if (brightness) results.push(await setBrightness(brightness));
  }

  return results;
}

module.exports = {
  setPower, setBrightness, setColor, setColorTemp,
  setSegmentColor, setSegmentBrightness, setMusicMode,
  executeCommand
};
