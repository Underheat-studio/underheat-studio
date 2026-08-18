// ======================================================================
// UNDERHEAT Studio — Auth0 + Role System
// ======================================================================

const FOUNDER_AUTH0_ID = "google-oauth2|113043894566831592879";

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

  window.auth0Client = await auth0.createAuth0Client({
    domain: "dev-2j6f0pfj7mazarrg.us.auth0.com",
    clientId: "dJvMivNXim7K63M3LSCd6w7NP0IDOWac",
    authorizationParams: {
      audience: "https://cold-cell-aa07.jkmeiihh.workers.dev",
      scope: "openid profile email read:role write:role",
      redirect_uri: window.location.origin
    }
  });

  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await window.auth0Client.handleRedirectCallback();
    window.history.replaceState({}, "", window.location.pathname);
    try {
      await window.auth0Client.getTokenSilently();
    } catch (e) {
      console.error("Failed to cache token:", e);
    }
  }

  async function getToken() {
    try {
      return await window.auth0Client.getTokenSilently();
    } catch {
      return null;
    }
  }

  // Fetch role from backend, with client-side founder fallback
  async function fetchRole() {
    const token = await getToken();
    if (!token) {
      console.warn("No token available");
      return "user";
    }

    // Client-side founder check: decode the token and check sub
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.sub === FOUNDER_AUTH0_ID) {
        console.log("Client-side founder check passed");
        return "founder";
      }
    } catch (e) {
      console.warn("Could not decode token for client-side check:", e);
    }

    // Try backend role endpoint
    try {
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
      console.error("Failed to fetch role from backend:", err.message);
      return "user";
    }
  }

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

  async function updateUI() {
    const isAuthenticated = await window.auth0Client.isAuthenticated();

    if (!isAuthenticated) {
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

    currentUser = await window.auth0Client.getUser();
    role = await fetchRole();
    console.log("FINAL ROLE:", role);

    userIndicator.textContent = `${currentUser.email} (${role})`;

    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    settingsBtn?.classList.remove("hidden");
    gated?.classList.remove("hidden");

    if (role === "founder" || role === "admin") {
      adminBtn?.classList.remove("hidden");
      debug?.classList.remove("hidden");
    } else {
      adminBtn?.classList.add("hidden");
      debug?.classList.add("hidden");
    }

    updateWebampVisibility();

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

  await updateUI();
});
