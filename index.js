// ======================================================================
// UNDERHEAT Studio — Auth0 + Backend Role System (SIMPLIFIED)
// ======================================================================

document.addEventListener("DOMContentLoaded", async () => {

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const adminBtn = document.getElementById("adminBtn");
  const feedbackBtn = document.getElementById("feedbackBtn");
  const userIndicator = document.getElementById("user-indicator");
  const gated = document.getElementById("gated-content");
  const debug = document.getElementById("debug-panel");
  const webampToggle = document.getElementById("webamp-toggle");
  const webampContainer = document.getElementById("webamp-container");

  let currentUser = null;
  let role = "user";
  let webamp = null;

  // Auth0 Client Setup
  window.auth0Client = await auth0.createAuth0Client({
    domain: "dev-2j6f0pfj7mazarrg.us.auth0.com",
    clientId: "dJvMivNXim7K63M3LSCd6w7NP0IDOWac",
    authorizationParams: {
      audience: "https://cold-cell-aa07.jkmeiihh.workers.dev",
      scope: "openid profile email read:role write:role",
      redirect_uri: window.location.origin
    }
  });

  // Handle Auth0 Redirect Callback
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await window.auth0Client.handleRedirectCallback();
    window.history.replaceState({}, "", window.location.pathname);
    try {
      await window.auth0Client.getTokenSilently();
    } catch (e) {
      console.error("Failed to cache token:", e);
    }
  }

  // Get Auth0 Token
  async function getToken() {
    try {
      return await window.auth0Client.getTokenSilently();
    } catch {
      return null;
    }
  }

  // Fetch role from backend
  async function fetchRole() {
    const token = await getToken();
    if (!token) {
      console.warn("No token available");
      return "user";
    }

    try {
      // Changed from hardcoded localhost:4000 to configurable API_BASE_URL
      // API_BASE_URL is set in config.js and can be overridden via environment variables.
      // For local dev, it defaults to localhost:4000; for production, it uses the Cloudflare Worker.
      const res = await fetch(`${window.API_BASE_URL}/api/role`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        console.error("Role endpoint returned status:", res.status);
        return "user";
      }

      const data = await res.json();
      console.log("Backend returned role:", data.role);
      return data.role || "user";
    } catch (err) {
      console.error("Failed to fetch role:", err.message);
      return "user";
    }
  }

  // Update Webamp Visibility
  function updateWebampVisibility() {
    if (role !== "founder") {
      webampToggle?.classList.add("hidden");
      webampContainer?.classList.add("hidden");
      if (webamp) webamp.dispose();
      webamp = null;
      return;
    }
    webampToggle?.classList.remove("hidden");
  }

  // Initialize Webamp
  async function initWebamp() {
    if (webamp) webamp.dispose();
    webamp = new Webamp({
      initialTracks: [
        { url: "assets/shout.mp4", metaData: { title: "Shout" } },
        { url: "assets/thatsall.mp4", metaData: { title: "That's All" } }
      ],
      initialSkin: { url: "assets/Fallout_Pip-Boy_3000_Amber_v4.wsz" }
    });
    await webamp.renderWhenReady(webampContainer);
    webampContainer?.classList.remove("hidden");
  }

  webampToggle?.addEventListener("click", () => {
    if (role !== "founder") return;
    if (!webamp) {
      initWebamp();
      webampToggle.textContent = "Hide Webamp Player";
    } else {
      webamp.dispose();
      webamp = null;
      webampContainer?.classList.add("hidden");
      webampToggle.textContent = "Show Webamp Player";
    }
  });

  // Main UI Update Function
  async function updateUI() {
    console.log("updateUI() starting...");
    
    const isAuthenticated = await window.auth0Client.isAuthenticated();
    console.log("isAuthenticated:", isAuthenticated);

    if (!isAuthenticated) {
      console.log("User not authenticated");
      currentUser = null;
      role = "user";
      userIndicator.textContent = "";
      loginBtn?.classList.remove("hidden");
      logoutBtn?.classList.add("hidden");
      settingsBtn?.classList.add("hidden");
      adminBtn?.classList.add("hidden");
      gated?.classList.add("hidden");
      debug?.classList.add("hidden");
      updateWebampVisibility();
      return;
    }

    // User is authenticated
    currentUser = await window.auth0Client.getUser();
    console.log("User object:", currentUser);
    
    role = await fetchRole();
    console.log("FINAL ROLE:", role);

    userIndicator.textContent = `${currentUser.email} (${role})`;

    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    settingsBtn?.classList.remove("hidden");
    gated?.classList.remove("hidden");

    // Show admin features only for founder/admin
    if (role === "founder" || role === "admin") {
      console.log("✓ SHOWING ADMIN FEATURES");
      adminBtn?.classList.remove("hidden");
      debug?.classList.remove("hidden");
    } else {
      console.log("✗ HIDING ADMIN FEATURES");
      adminBtn?.classList.add("hidden");
      debug?.classList.add("hidden");
    }

    updateWebampVisibility();

    // Update debug panel
    if (debug) {
      const token = await getToken();
      const decoded = token ? JSON.parse(atob(token.split(".")[1])) : null;
      debug.textContent = 
        "=== DEBUG ===\n" +
        `Auth: ${isAuthenticated}\n` +
        `Role: ${role}\n` +
        `Email: ${currentUser.email}\n` +
        `Sub: ${decoded?.sub || 'none'}\n` +
        "==============";
    }
  }

  // Event Listeners
  loginBtn?.addEventListener("click", () => {
    window.auth0Client.loginWithRedirect();
  });

  logoutBtn?.addEventListener("click", () => {
    window.auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  });

  feedbackBtn?.addEventListener("click", () => {
    window.location.href = "/feedback.html";
  });

  settingsBtn?.addEventListener("click", () => {
    window.location.href = "/settings.html";
  });

  adminBtn?.addEventListener("click", () => {
    window.location.href = "/admin.html";
  });

  console.log("=== STARTING APPLICATION ===");
  await updateUI();
  console.log("=== INITIALIZATION COMPLETE ===");
});
