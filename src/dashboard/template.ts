export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EcoPrompt Analytics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --bg-surface: #0a0a0a;
      --border: #262626;
      --border-hover: #404040;
      --text-primary: #ededed;
      --text-secondary: #a3a3a3;
      --text-tertiary: #737373;
      
      --accent-green: #10b981;
      --accent-green-bg: rgba(16, 185, 129, 0.1);
      
      --accent-blue: #3b82f6;
      --accent-blue-bg: rgba(59, 130, 246, 0.1);
      
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      
      --radius-sm: 6px;
      --radius-md: 12px;
      --radius-lg: 16px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-green);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent-green);
      animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Metrics Grid */
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
    }

    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      transition: border-color 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .metric-card:hover {
      border-color: var(--border-hover);
    }

    .metric-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric-value {
      font-size: 2.25rem;
      font-weight: 600;
      letter-spacing: -0.04em;
    }

    .value-green { color: var(--accent-green); }
    .value-blue { color: var(--accent-blue); }

    /* Sections */
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 2rem;
    }

    .section-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title {
      font-weight: 600;
      font-size: 1rem;
    }

    /* Feed Table */
    .feed-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .feed-table th {
      padding: 1rem 1.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
    }

    .feed-table td {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      vertical-align: middle;
    }

    .feed-table tr:last-child td {
      border-bottom: none;
    }

    .feed-table tr {
      transition: background-color 0.2s ease;
    }

    .feed-table tr:hover {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: var(--font-mono);
      letter-spacing: 0.02em;
    }

    .badge.downgraded {
      background: var(--accent-green-bg);
      color: var(--accent-green);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge.kept {
      background: var(--accent-blue-bg);
      color: var(--accent-blue);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .model-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .model-original {
      font-family: var(--font-mono);
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .model-actual {
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--text-primary);
    }

    .mono-cell {
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }

    .reason-text {
      color: var(--text-secondary);
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .savings {
      font-family: var(--font-mono);
      font-weight: 600;
      text-align: right;
    }

    .savings.positive {
      color: var(--accent-green);
    }

    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-tertiary);
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .modal.show {
      display: flex;
      opacity: 1;
    }

    .modal-content {
      width: 100%;
      max-width: 600px;
      margin: 2rem;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .icon-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .icon-btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
    }

    /* Form Styles */
    .settings-form {
      padding: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .form-input, .form-select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text-primary);
      font-family: var(--font-sans);
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      transition: border-color 0.2s ease;
      width: 100%;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: var(--accent-blue);
    }

    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .btn {
      background: var(--accent-blue);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .btn:hover {
      background: #2563eb;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--accent-green);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: var(--radius-md);
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* SVG Icons */
    svg {
      width: 1rem;
      height: 1rem;
    }
    
    .brand-svg {
      width: 18px;
      height: 18px;
      color: white;
    }

  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">
          <svg class="brand-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div class="brand-title">EcoPrompt Proxy</div>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="status-badge">
          <div class="status-dot"></div>
          Monitoring Live
        </div>
        <button id="open-settings" class="icon-btn" title="Settings">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      </div>
    </header>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          Total Requests
        </div>
        <div class="metric-value" id="val-requests">0</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          Downgrade Rate
        </div>
        <div class="metric-value value-blue" id="val-downgraded">0%</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Money Saved
        </div>
        <div class="metric-value value-green" id="val-saved">$0.0000</div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal">
      <div class="modal-content section-card">
        <div class="section-header">
          <div class="section-title">Configuration Settings</div>
          <button id="close-modal" class="icon-btn" title="Close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form id="settings-form" class="settings-form">
          <div class="form-group">
            <label class="form-label">Scoring Provider</label>
            <select class="form-select" id="scorerProvider" required>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="custom">Custom (OpenAI Compatible)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Scoring Model</label>
            <input type="text" class="form-input" id="scorerModel" placeholder="e.g. gpt-4o-mini" required>
          </div>

          <div class="form-group">
            <label class="form-label">Custom Base URL (Optional)</label>
            <input type="url" class="form-input" id="scorerEndpoint" placeholder="e.g. https://api.groq.com/openai/v1">
          </div>

          <div class="form-group">
            <label class="form-label">Scorer API Key (Leave blank to keep existing)</label>
            <input type="password" class="form-input" id="scorerKey" placeholder="••••••••••••••••">
          </div>

          <div style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
            <div class="section-title" style="margin-bottom: 1rem;">Coding Agent Configuration (Optional)</div>
            <p style="color: var(--text-tertiary); font-size: 0.85rem; margin-bottom: 1rem;">
              If you provide your coding API key here, EcoPrompt will automatically inject it into requests. You won't need to configure keys in your terminal tools anymore!
            </p>
            <div class="form-group">
              <label class="form-label">Coding API Key (Leave blank to keep existing)</label>
              <input type="password" class="form-input" id="codingKey" placeholder="••••••••••••••••">
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn" id="saveBtn">Save Configuration</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">Recent Activity</div>
      </div>
      <table class="feed-table">
        <thead>
          <tr>
            <th style="width: 120px">Action</th>
            <th>Model Routing</th>
            <th>Reason</th>
            <th style="text-align: right">Score</th>
            <th style="text-align: right">Savings</th>
          </tr>
        </thead>
        <tbody id="request-list">
          <tr>
            <td colspan="5">
              <div class="empty-state">Waiting for your first AI request...</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="toast" class="toast">Settings saved successfully!</div>

  <script>
    const numberFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

    // -----------------------------------------------------
    // Settings Form Logic
    // -----------------------------------------------------
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('saveBtn');
    const toast = document.getElementById('toast');

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const config = await res.json();
          document.getElementById('scorerProvider').value = config.scorerProvider || 'anthropic';
          document.getElementById('scorerModel').value = config.scorerModel || '';
          document.getElementById('scorerEndpoint').value = config.scorerEndpoint || '';
          if (config.scorerKeySet) {
            document.getElementById('scorerKey').placeholder = "•••••••••••••••• (Key is saved)";
          }
          if (config.codingKeySet) {
            document.getElementById('codingKey').placeholder = "•••••••••••••••• (Key is saved)";
          }
        }
      } catch(e) {
        console.error('Failed to load settings', e);
      }
    }

    function showToast() {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';

      const data = {
        scorerProvider: document.getElementById('scorerProvider').value,
        scorerModel: document.getElementById('scorerModel').value,
        scorerEndpoint: document.getElementById('scorerEndpoint').value,
        scorerKey: document.getElementById('scorerKey').value, // Will be empty string if untouched
      };
      
      const codingKeyValue = document.getElementById('codingKey').value;
      if (codingKeyValue !== '') {
        data.codingKey = codingKeyValue;
      }

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          document.getElementById('scorerKey').value = ''; // clear password field
          document.getElementById('scorerKey').placeholder = "•••••••••••••••• (Key is saved)";
          document.getElementById('codingKey').value = ''; // clear password field
          document.getElementById('codingKey').placeholder = "•••••••••••••••• (Key is saved)";
          showToast();
          modal.classList.remove('show');
        }
      } catch (err) {
        console.error('Failed to save', err);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Configuration';
      }
    });

    // Modal behavior
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings');
    const closeBtn = document.getElementById('close-modal');

    openBtn.addEventListener('click', () => modal.classList.add('show'));
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });

    // Load settings on boot
    loadSettings();


    // -----------------------------------------------------
    // Stats Dashboard Logic
    // -----------------------------------------------------
    async function updateStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        // Update Metrics
        document.getElementById('val-requests').innerText = data.totalRequests;
        
        const rate = data.totalRequests 
          ? (data.downgradedRequests / data.totalRequests * 100).toFixed(1) 
          : 0;
        document.getElementById('val-downgraded').innerText = rate + '%';
        
        document.getElementById('val-saved').innerText = numberFormatter.format(data.totalSaved);

        // Update Feed
        const tbody = document.getElementById('request-list');
        
        if (!data.requestLog || data.requestLog.length === 0) {
          tbody.innerHTML = \`
            <tr>
              <td colspan="5">
                <div class="empty-state">Waiting for your first AI request...</div>
              </td>
            </tr>\`;
          return;
        }

        tbody.innerHTML = data.requestLog.map(req => {
          const isDowngraded = req.originalModel !== req.actualModel;
          const badgeClass = isDowngraded ? 'downgraded' : 'kept';
          const badgeText = isDowngraded ? 'DOWNGRADED' : 'PASSTHROUGH';
          
          const scoreDisplay = req.score !== undefined ? req.score.toFixed(3) : '---';
          const savedDisplay = isDowngraded ? '+' + numberFormatter.format(req.saved) : '---';
          
          return \`
            <tr>
              <td>
                <div class="badge \${badgeClass}">\${badgeText}</div>
              </td>
              <td>
                <div class="model-group">
                  \${isDowngraded 
                    ? \`<div class="model-original" style="text-decoration: line-through">\${req.originalModel}</div>
                       <div class="model-actual">\${req.actualModel}</div>\`
                    : \`<div class="model-actual">\${req.originalModel}</div>\`
                  }
                </div>
              </td>
              <td>
                <div class="reason-text" title="\${req.reason || ''}">\${req.reason || 'No heuristic match'}</div>
              </td>
              <td class="mono-cell" style="text-align: right">\${scoreDisplay}</td>
              <td class="savings \${isDowngraded ? 'positive' : ''}">\${savedDisplay}</td>
            </tr>
          \`;
        }).join('');
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    }
    
    // Initial fetch
    updateStats();
    
    // Poll every 2 seconds
    setInterval(updateStats, 2000);
  </script>
</body>
</html>`;
}
