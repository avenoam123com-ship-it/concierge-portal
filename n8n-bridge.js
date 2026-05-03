/**
 * n8n-bridge.js
 * ═════════════════════════════════════════════════════════════
 * Lightweight webhook integration between ConciergePortal form
 * and n8n automation platform.
 *
 * Setup: Define N8N_WEBHOOK_URL before including this script
 * Usage: Call sendLeadToN8n(leadData) after form submission
 * ═════════════════════════════════════════════════════════════
 */

// ── Configuration ──────────────────────────────────────────────
// Define this BEFORE including n8n-bridge.js in HTML:
//   <script>
//     window.N8N_CONFIG = {
//       webhook_url: 'https://your-n8n.cloud/webhook/leads',
//       api_key: null, // optional, if webhook requires auth
//       timeout_ms: 8000,
//       retry_on_failure: true,
//       max_retries: 2
//     };
//   </script>

const N8N = {
  config: window.N8N_CONFIG || {
    webhook_url: null,
    api_key: null,
    timeout_ms: 8000,
    retry_on_failure: true,
    max_retries: 2
  },

  isConfigured() {
    return !!(this.config?.webhook_url);
  },

  async send(leadData, attempt = 1) {
    if (!this.isConfigured()) {
      console.warn('[n8n] Webhook not configured. Set window.N8N_CONFIG.webhook_url');
      return false;
    }

    try {
      const payload = {
        ...leadData,
        _source: 'concierge-portal',
        _timestamp: new Date().toISOString(),
        _userAgent: navigator.userAgent?.substring(0, 200)
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout_ms || 8000
      );

      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.config.api_key) {
        headers['Authorization'] = `Bearer ${this.config.api_key}`;
      }

      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('[n8n] ✓ Lead delivered', { tier: leadData.tier, name: leadData.name });
        this._recordSuccess(leadData);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      const isRetryable = error.name === 'AbortError' || error.message.includes('HTTP 5');
      const shouldRetry = isRetryable && this.config.retry_on_failure && attempt < this.config.max_retries;

      console.warn(
        `[n8n] ✗ Attempt ${attempt} failed: ${error.message}`,
        { shouldRetry }
      );

      if (shouldRetry) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
        return this.send(leadData, attempt + 1);
      }

      this._recordFailure(leadData, error.message);
      return false;
    }
  },

  _recordSuccess(leadData) {
    try {
      const sent = JSON.parse(sessionStorage.getItem('n8n_sent') || '[]');
      sent.push({
        ...leadData,
        sentAt: new Date().toISOString(),
        status: 'success'
      });
      sessionStorage.setItem('n8n_sent', JSON.stringify(sent.slice(-20)));
    } catch (_) {}
  },

  _recordFailure(leadData, error) {
    try {
      const failed = JSON.parse(localStorage.getItem('n8n_failed') || '[]');
      failed.push({
        ...leadData,
        failedAt: new Date().toISOString(),
        error: error.substring(0, 100),
        status: 'failed'
      });
      localStorage.setItem('n8n_failed', JSON.stringify(failed.slice(-10)));
    } catch (_) {}
  },

  // Async wrapper — non-blocking, returns immediately
  sendAsync(leadData) {
    this.send(leadData).catch(err => {
      console.error('[n8n] Unhandled error:', err);
    });
  },

  // Get diagnostic info
  getStatus() {
    const sent = JSON.parse(sessionStorage.getItem('n8n_sent') || '[]');
    const failed = JSON.parse(localStorage.getItem('n8n_failed') || '[]');
    return {
      configured: this.isConfigured(),
      webhook_url: this.config.webhook_url?.substring(0, 50) + '...',
      sent_this_session: sent.length,
      failed_pending_retry: failed.length,
      last_sent: sent[sent.length - 1],
      last_failed: failed[failed.length - 1]
    };
  }
};

// ── Global export ──────────────────────────────────────────────
// Usage: await N8N.send(leadData);
// Or:    N8N.sendAsync(leadData); // non-blocking
window.N8N = N8N;

console.log('[n8n-bridge] Loaded. Configure with window.N8N_CONFIG = { webhook_url: "..." }');
