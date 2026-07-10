<div align="center">
  <h1>🌿 EcoPrompt CLI</h1>
  <p><b>Zero-config reverse proxy that cuts your AI vibe-coding costs by up to 60%.</b></p>
  <p>
    <a href="https://github.com/farokiraquib/ecoprompt">⭐ Star us on GitHub</a> |
    <a href="https://github.com/farokiraquib/ecoprompt/issues">🐛 Report a Bug</a>
  </p>
</div>

EcoPrompt sits between your terminal AI agents (like Claude Code, Aider, Cline, or Cursor) and the AI providers. It instantly analyzes the complexity of your prompts and **intelligently routes simple tasks to cheaper models** while keeping hard tasks on premium models. 

The result? You get the exact same coding experience, but your API bill drops drastically.

---

## ✨ Features

- **🪄 Zero-Config Setup**: Just type `ecoprompt`. Our interactive wizard will guide you to set up your API keys in 10 seconds.
- **🌍 Universal Support (NEW)**: Use any provider! Choose Claude, OpenAI, Gemini, or even plug in custom endpoints for **Groq, LM Studio, or local Ollama models**. It will dynamically fetch your available models for you to pick!
- **🧠 Hybrid AI Routing**: Uses blindingly fast heuristics (<1ms) for obvious tasks ("fix typo"), and cheap AI models (~300ms) to semantically score borderline prompts.
- **📊 Beautiful Live Dashboard**: Watch your savings pile up in real-time on a sleek, dark-mode web dashboard.
- **⚡ Zero-Copy Streaming**: Bypasses heavy frameworks to pipe data directly to your CLI. You won't even notice it's there.
- **🛡️ Fail-Open Design**: If anything goes wrong, requests pass through unchanged. It never breaks your workflow.

---

## 🚀 Quick Start

Getting started takes less than a minute.

### 1. Install Globally
```bash
npm install -g ecoprompt-cli
```

### 2. Start the Proxy
Simply run the command. If it's your first time, the interactive wizard will ask for your preferred scoring provider (Anthropic, OpenAI, or Gemini) and securely save your API key.
```bash
ecoprompt
```
*The proxy is now running locally at `http://localhost:3000`.*

### 3. View Your Dashboard
Open your browser and navigate to:
👉 **[http://localhost:3000/stats](http://localhost:3000/stats)** to see your live vibe-coding savings!

---

## 🔌 Connecting Your Coding Tools

There are hundreds of AI coding tools, but they all work the same way. 

To use them with EcoPrompt, you always need to do two things inside your coding tool:
1. **Set your Coding API Key** (e.g., your OpenAI or Anthropic key used for actually writing the code).
2. **Set the Base URL to `http://localhost:3000`** (so it routes through EcoPrompt instead of the internet).

Here are step-by-step instructions for the most popular tools:

### ⌨️ Aider (Terminal)
1. Export your coding API key in your terminal (e.g., for OpenAI):
```bash
export OPENAI_API_KEY="your-api-key"
```
2. Start Aider and tell it to use EcoPrompt as the Base URL:
```bash
aider --api-base http://localhost:3000
```

### 🤖 Claude Code (Terminal)
1. Export your Anthropic coding API key:
```bash
export ANTHROPIC_API_KEY="your-api-key"
```
2. Export the EcoPrompt Base URL:
```bash
export ANTHROPIC_BASE_URL="http://localhost:3000"
```
3. Start Claude Code normally:
```bash
claude
```

### 🖱️ Cursor (IDE)
1. Open Cursor Settings (`Cmd/Ctrl + Shift + J`).
2. Go to **Models** > **OpenAI API Key** (or Anthropic).
3. Paste your coding API Key.
4. Click **Override Base URL** and set it to: `http://localhost:3000/v1`

### 🚀 Google Antigravity (CLI / IDE)
If you are using Antigravity 2.0 or the `agy` CLI, export the Base URL for your specific model provider (e.g., Gemini or Anthropic) before starting:
```bash
export GEMINI_API_BASE_URL="http://localhost:3000"
# or export ANTHROPIC_BASE_URL="http://localhost:3000"
agy
```

### 💻 Cline / Roo Code (VS Code Extension)
1. Open the Extension Settings.
2. Under **API Provider**, select your provider (e.g., Anthropic).
3. Paste your coding API key into the Key box.
4. Paste `http://localhost:3000` into the **Base URL** box.

### 🧩 Continue.dev (VS Code)
1. Open your `config.json` in Continue.
2. Add your model configuration like this:
   ```json
   "models": [{
     "title": "EcoPrompt",
     "provider": "openai",
     "model": "gpt-4o",
     "apiKey": "your-coding-api-key",
     "apiBase": "http://localhost:3000/v1"
   }]
   ```

---

## 🧪 How to Test (Without Paid APIs!)

Don't have a Claude or OpenAI key? Want to test it entirely for free? You can use **Groq** or local models like **Ollama**!

### Testing with Groq
1. Create a free API key at [console.groq.com](https://console.groq.com/).
2. Run `ecoprompt`.
3. In the wizard, select **Custom (OpenAI Compatible)**.
4. Enter `https://api.groq.com/openai/v1` as the Base URL.
5. Paste your Groq API key.
6. EcoPrompt will automatically fetch Groq's models (e.g., `llama-3.1-8b-instant`) for you to select!

### Fast CLI Testing
You don't need a complex agent to test it. Open a new terminal and run a simple `curl` command against your local proxy:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "fix typo"}]
  }'
```
*Check your EcoPrompt terminal or dashboard! You'll see it recognized "fix typo" and downgraded it from `gpt-4o` to `gpt-4o-mini` instantly!*

---

## ⚙️ How Scoring Works

EcoPrompt uses a brilliant two-tier scoring system to guarantee you never get a bad response:

1. **Fast Heuristics (< 1ms)**: Catches trivially obvious things.
   - *User:* "fix typo in line 4" → **Score 0.1** (Simple ✅)
   - *User:* "architect a distributed caching system" → **Score 0.9** (Complex ❌)

2. **AI Classifier (~300ms)**: For everything in between, it asks an ultra-cheap model (like Haiku or GPT-4o-mini) to semantically understand your prompt using conversation context.
   - *User:* "ok proceed" (after a complex plan) → **Score 0.8** (Complex ❌)

> **Conservative by default:** When in doubt, EcoPrompt *always* keeps the premium model. A missed saving costs pennies; a bad downgrade costs your time.

---

## 🎛️ Advanced Configuration

EcoPrompt is zero-config by default, but highly customizable for power users.

| CLI Flag | Default | Description |
|---|---|---|
| `-p, --port` | `3000` | Port for the proxy and dashboard to run on |
| `-t, --target` | `https://api.anthropic.com` | Upstream API URL to proxy requests to |
| `--threshold` | `0.4` | Complexity cutoff (0.0 to 1.0). Below this triggers a downgrade |
| `-s, --scorer` | `hybrid` | Scoring mode: `heuristic`, `ai`, or `hybrid` |
| `--scorer-model` | *Auto-selected* | Explicitly define the model used to score complexity |

*Example:*
```bash
ecoprompt --port 8080 --threshold 0.5 --target https://api.openai.com
```

---

## 🔒 Privacy & Security

**100% Local.** EcoPrompt stores your configuration locally in `~/.ecoprompt/config.json`. There is absolutely no telemetry, no tracking, and no data leaves your machine except to go directly to your chosen AI providers.

## 📄 License
MIT License
