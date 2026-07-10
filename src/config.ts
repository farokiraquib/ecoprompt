import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.ecoprompt');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface EcopromptSavedConfig {
  port?: string | number;
  target?: string;
  threshold?: string | number;
  scorer?: 'heuristic' | 'ai' | 'hybrid';
  scorerModel?: string;
  scorerKey?: string;
  scorerEndpoint?: string;
  scorerProvider?: 'anthropic' | 'openai' | 'gemini' | 'custom';
  codingKey?: string;
}

export function loadSavedConfig(): EcopromptSavedConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    // ignore
  }
  return {};
}

export function saveUpdatedConfig(newConfig: Partial<EcopromptSavedConfig>): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const current = loadSavedConfig();
    const merged = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}
