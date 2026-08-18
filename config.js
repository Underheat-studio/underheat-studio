// ======================================================================
// UNDERHEAT Studio — API Configuration
// ======================================================================
// This config file provides a centralized place to manage API endpoints.
// On GitHub Pages, the API_BASE_URL can be set via environment variable
// or GitHub Secrets injected into the build process.
// For local development, it defaults to http://localhost:4000
// ======================================================================

(function() {
  // Check if API_BASE_URL is set globally (e.g., by build process)
  if (typeof window.API_BASE_URL === 'undefined') {
    // Try to get from localStorage (set during deployment)
    const stored = localStorage.getItem('api_base_url');
    if (stored) {
      window.API_BASE_URL = stored;
    } else {
      // Detect environment and set default
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development: use backend proxy
        window.API_BASE_URL = 'http://localhost:4000';
      } else {
        // Production (GitHub Pages or deployed): use Cloudflare Worker
        // Can be overridden via GitHub Secrets in workflow
        window.API_BASE_URL = 'https://cold-cell-aa07.jkmeiihh.workers.dev';
      }
    }
  }

  // Log configuration (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[API Config] Using API_BASE_URL:', window.API_BASE_URL);
  }
})();
