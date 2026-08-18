// UNDERHEAT Studio — Admin Panel (Auth0 + KV Roles)

document.addEventListener("DOMContentLoaded", async () => {
  console.log("ADMIN.JS: Loaded");

  // ---------------------------------------------------------
  // ELEMENTS
  // ---------------------------------------------------------
  const statusBox = document.getElementById("admin-status");
  const userList = document.getElementById("admin-user-list");
  const adminUserIndicator = document.getElementById("admin-user-indicator");

  const backBtn = document.getElementById("back-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const navUsers = document.getElementById("nav-users");
  const navRoles = document.getElementById("nav-roles");
  const navLogs = document.getElementById("nav-logs");

  const sectionUsers = document.getElementById("admin-users-section");
  const sectionRoles = document.getElementById("admin-roles-section");
  const sectionLogs = document.getElementById("admin-logs-section");

  const roleUserId = document.getElementById("role-user-id");
  const roleSelect = document.getElementById("role-select");
  const applyRoleBtn = document.getElementById("apply-role-btn");

  // ---------------------------------------------------------
  // AUTH0 INITIALIZATION
  // ---------------------------------------------------------
  const auth0Client = await auth0.createAuth0Client({
    domain: "dev-2j6f0pfj7mazarrg.us.auth0.com",
    clientId: "dJvMivNXim7K63M3LSCd6w7NP0IDOWac",
    authorizationParams: {
      redirect_uri: window.location.origin
    }
  });

  // ---------------------------------------------------------
  // HANDLE REDIRECT CALLBACK
  // ---------------------------------------------------------
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, "", window.location.pathname);
  }

  // ---------------------------------------------------------
  // GET TOKEN
  // ---------------------------------------------------------
  async function getToken() {
    try {
      return await auth0Client.getTokenSilently();
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------
  // API BASE URL
  // ---------------------------------------------------------
  // Changed from hardcoded Cloudflare Worker URL to use configurable API_BASE_URL
  // (set in config.js). This allows GitHub Pages to use either localhost:4000 for local dev
  // or the production Cloudflare Worker URL when deployed.
  const API_BASE = window.API_BASE_URL || 'https://cold-cell-aa07.jkmeiihh.workers.dev';

  // ---------------------------------------------------------
  // API HELPER (FIXED)
  // ---------------------------------------------------------
  async function api(path, method = "GET", body = null) {
    const token = await getToken();
    if (!token) return { success: false, message: "No token" };

    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    };

    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      return await res.json();
    } catch (err) {
      console.error("API Error:", err);
      return { success: false, message: "Network error" };
    }
  }

  // ---------------------------------------------------------
  // CHECK AUTHORIZATION
  // ---------------------------------------------------------
  async function checkAuth() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = "Not logged in. Redirecting...";
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return null;
    }

    const roleRes = await api("/api/role");
    const role = roleRes.role || "guest";

    if (!["admin", "founder"].includes(role)) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = `Unauthorized. Your role is "${role}".`;
      setTimeout(() => (window.location.href = "/index.html"), 3000);
      return null;
    }

    return role;
  }

  // ---------------------------------------------------------
  // LOAD USERS FROM KV
  // ---------------------------------------------------------
  async function loadUsers() {
    userList.innerHTML = "<p class='small muted'>Loading users...</p>";

    userList.innerHTML = `
      <p class="small muted">
        User listing requires a /api/list-users endpoint.<br>
        Your KV currently stores users by ID only.<br><br>
        I can generate the Worker code for this if you want.
      </p>
    `;
  }

  // ---------------------------------------------------------
  // APPLY ROLE
  // ---------------------------------------------------------
  applyRoleBtn.addEventListener("click", async () => {
    const targetUserId = roleUserId.value.trim();
    const newRole = roleSelect.value;

    if (!targetUserId) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = "Enter a user ID.";
      return;
    }

    const res = await api("/api/set-role", "POST", {
      targetUserId,
      newRole
    });

    statusBox.classList.remove("hidden");

    if (res.success) {
      statusBox.textContent = `✓ Role updated to "${newRole}"`;
    } else {
      statusBox.textContent = `Error: ${res.message}`;
    }
  });

  // ---------------------------------------------------------
  // NAVIGATION BETWEEN SECTIONS
  // ---------------------------------------------------------
  function showSection(section) {
    sectionUsers.classList.add("hidden");
    sectionRoles.classList.add("hidden");
    sectionLogs.classList.add("hidden");

    navUsers.classList.remove("active");
    navRoles.classList.remove("active");
    navLogs.classList.remove("active");

    section.classList.remove("hidden");

    if (section === sectionUsers) navUsers.classList.add("active");
    if (section === sectionRoles) navRoles.classList.add("active");
    if (section === sectionLogs) navLogs.classList.add("active");
  }

  navUsers.addEventListener("click", () => showSection(sectionUsers));
  navRoles.addEventListener("click", () => showSection(sectionRoles));
  navLogs.addEventListener("click", () => showSection(sectionLogs));

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------
  logoutBtn.addEventListener("click", () => {
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  });

  // ---------------------------------------------------------
  // BACK BUTTON
  // ---------------------------------------------------------
  backBtn.addEventListener("click", () => {
    window.location.href = "/index.html";
  });

  // ---------------------------------------------------------
  // INITIALIZE
  // ---------------------------------------------------------
  const role = await checkAuth();
  if (!role) return;

  const user = await auth0Client.getUser();
  adminUserIndicator.textContent = `${user.email} (${role})`;

  statusBox.classList.remove("hidden");
  statusBox.textContent = "✓ Admin access granted.";

  await loadUsers();
  showSection(sectionUsers);
});
