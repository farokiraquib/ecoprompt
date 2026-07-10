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

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .metric-card:hover::before {
      opacity: 1;
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

    /* Feed */
    .feed-section {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    .feed-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .feed-title {
      font-weight: 600;
      font-size: 1rem;
    }

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

    .model-arrow {
      color: var(--text-tertiary);
      margin: 0 0.5rem;
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
      <div class="status-badge">
        <div class="status-dot"></div>
        Monitoring Live
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

    <div class="feed-section">
      <div class="feed-header">
        <div class="feed-title">Recent Activity</div>
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

  <script>
    const numberFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

    function formatTime(timestamp) {
      if (!timestamp) return '';
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
    }

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
