#!/usr/bin/env node

// EcoPrompt CLI — Zero-config reverse proxy for AI cost optimization
// This file is the CLI entry point that parses arguments and starts the proxy server.

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { select, password } from '@inquirer/prompts';
import { startServer } from '../dist/index.js';

// Setup config paths
const CONFIG_DIR = path.join(os.homedir(), '.ecoprompt');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Load saved config
let savedConfig = {};
try {
  if (fs.existsSync(CONFIG_FILE)) {
    savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
} catch (e) {
  // ignore
}

function saveConfig(newConfig) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const merged = { ...savedConfig, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    savedConfig = merged;
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

const program = new Command();

program
  .name('ecoprompt')
  .description('Zero-config reverse proxy that optimizes AI coding sessions by intelligently routing prompts to cheaper models')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port to listen on', savedConfig.port || '3000')
  .option('-t, --target <url>', 'Target API URL to proxy to', savedConfig.target || 'https://api.anthropic.com')
  .option('--threshold <number>', 'Complexity score threshold (0-1). Below this = downgrade', savedConfig.threshold || '0.4')
  .option('-s, --scorer <mode>', 'Scoring mode: heuristic, ai, or hybrid', savedConfig.scorer || 'hybrid')
  .option('--scorer-model <model>', 'Model to use for AI scoring', savedConfig.scorerModel || 'claude-3-5-haiku-20241022')
  .option('--scorer-key <key>', 'API key for the scorer model', savedConfig.scorerKey || '')
  .option('--scorer-endpoint <url>', 'API endpoint for the scorer model', savedConfig.scorerEndpoint || '')
  .option('--scorer-provider <provider>', 'API format for scorer: anthropic, openai, gemini', savedConfig.scorerProvider || 'anthropic')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--no-conservative', 'Disable conservative mode')
  .option('--no-stats', 'Disable cost savings stats')
  .option('--no-color', 'Disable colored output')
  .action(async (options) => {
    let currentProvider = options.scorerProvider;
    let currentKey = options.scorerKey || process.env.ECOPROMPT_SCORER_KEY || process.env.ANTHROPIC_API_KEY || '';
    let currentModel = options.scorerModel;

    // Interactive Wizard if key is missing and mode isn't heuristic
    if (options.scorer !== 'heuristic' && !currentKey) {
      console.log(chalk.yellow('\n⚠️  No API key found for the AI Scorer.'));
      console.log(chalk.white('Let\'s set up your EcoPrompt scorer so you can start saving money!\n'));

      const selectedProvider = await select({
        message: 'Which provider would you like to use for prompt scoring?',
        choices: [
          { name: 'Anthropic (Recommended - fast & cheap)', value: 'anthropic', description: 'Uses claude-3-5-haiku' },
          { name: 'OpenAI', value: 'openai', description: 'Uses gpt-4o-mini' },
          { name: 'Google Gemini', value: 'gemini', description: 'Uses gemini-2.5-flash' },
          { name: 'Custom (OpenAI Compatible) - e.g. Groq, Ollama', value: 'custom', description: 'Plug in any OpenAI-compatible endpoint' }
        ],
      });

      let providedKey = '';
      let customEndpoint = '';
      
      if (selectedProvider === 'custom') {
        const { input } = await import('@inquirer/prompts');
        customEndpoint = await input({
          message: 'Enter the Base API URL (e.g. https://api.groq.com/openai/v1 or http://localhost:11434/v1):',
          validate: (val) => val.startsWith('http') || 'Must start with http:// or https://'
        });
        
        providedKey = await password({
          message: 'Enter API Key (press Enter to skip if using local/Ollama):',
          mask: '*',
        });
        
        // Dynamically fetch models
        let models = [];
        try {
          console.log(chalk.gray('Fetching available models...'));
          const urlObj = new URL(customEndpoint);
          // Standard OpenAI models endpoint usually drops the /chat/completions part if included,
          // but let's assume customEndpoint is the base, e.g., /v1
          const modelsUrl = customEndpoint.endsWith('/') ? customEndpoint + 'models' : customEndpoint + '/models';
          const res = await fetch(modelsUrl, {
            headers: providedKey ? { 'Authorization': `Bearer ${providedKey}` } : {}
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
              models = data.data.map(m => m.id);
            }
          }
        } catch (e) {
          console.log(chalk.yellow('⚠️ Could not fetch models automatically.'));
        }
        
        if (models.length > 0) {
          currentModel = await select({
            message: 'Select the model to use for scoring:',
            choices: models.map(m => ({ name: m, value: m }))
          });
        } else {
          currentModel = await input({
            message: 'Enter the model name to use for scoring (e.g. llama-3.1-8b-instant):',
            validate: (val) => val.length > 0 || 'Model name is required'
          });
        }
        
        currentProvider = 'openai'; // Treat custom as openai under the hood
      } else {
        providedKey = await password({
          message: `Please paste your ${selectedProvider} API key (it will be securely saved locally):`,
          mask: '*',
          validate: (input) => input.length > 5 || 'Please enter a valid API key.',
        });
        
        currentProvider = selectedProvider;
        if (currentProvider === 'openai') {
          currentModel = 'gpt-4o-mini';
        } else if (currentProvider === 'gemini') {
          currentModel = 'gemini-2.5-flash';
        } else {
          currentModel = 'claude-3-5-haiku-20241022';
        }
      }

      currentKey = providedKey;

      // Save it so they don't have to do it again
      saveConfig({
        scorerProvider: currentProvider,
        scorerKey: currentKey,
        scorerModel: currentModel,
        scorerEndpoint: customEndpoint || undefined
      });

      console.log(chalk.green('✅ Configuration saved successfully to ~/.ecoprompt/config.json\n'));
    }

    const config = {
      port: parseInt(options.port, 10),
      target: options.target,
      threshold: parseFloat(options.threshold),
      scorer: options.scorer,
      scorerModel: currentModel,
      scorerKey: currentKey,
      scorerEndpoint: options.scorerEndpoint || getDefaultEndpoint(currentProvider, options.target),
      scorerProvider: currentProvider,
      verbose: options.verbose || false,
      conservative: options.conservative !== false,
      noColor: options.color === false,
      showStats: options.stats !== false,
    };

    try {
      await startServer(config);
    } catch (err) {
      console.error(chalk.red('Failed to start EcoPrompt:'), err.message);
      process.exit(1);
    }
  });

function getDefaultEndpoint(provider, target) {
  if (provider === 'openai') return 'https://api.openai.com';
  if (provider === 'anthropic') return 'https://api.anthropic.com';
  if (provider === 'gemini') return 'https://generativelanguage.googleapis.com';
  return target;
}

program.parse();
