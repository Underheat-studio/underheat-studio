// UNDERHEAT Studio — Admin Panel (Auth0 + Role System)

const FOUNDER_AUTH0_ID = "google-oauth2|113043894566831592879";

document.addEventListener("DOMContentLoaded", async () => {

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

  const auth0Client = await auth0.createAuth0Client({
    domain: "dev-2j6f0pfj7mazarrg.us.auth0.com",
    clientId: "dJvMivNXim7K63M3LSCd6w7NP0IDOWac",
    authorizationParams: {
      audience: "https://cold-cell-aa07.jkmeiihh.workers.dev",
      scope: "openid profile email read:role write:role",
      redirect_uri: window.location.origin
    }
  });

  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function getToken() {
    try {
      return await auth0Client.getTokenSilently();
    } catch {
      return null;
    }
  }

  const API_BASE = window.API_BASE_URL || 'https://cold-cell-aa07.jkmeiihh.workers.dev';

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

  async function checkAuth() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = "Not logged in. Redirecting...";
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return null;
    }

    // Client-side founder check first
    const token = await getToken();
    let role = "user";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.sub === FOUNDER_AUTH0_ID) {
          role = "founder";
        }
      } catch (e) {
        console.warn("Could not decode token:", e);
      }
    }

    // If not founder from client check, try backend
    if (role !== "founder") {
      const roleRes = await api("/api/role");
      role = roleRes.role || "guest";
    }

    if (!["admin", "founder"].includes(role)) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = `Unauthorized. Your role is "${role}".`;
      setTimeout(() => (window.location.href = "/index.html"), 3000);
      return null;
    }

    return role;
  }

  async function loadUsers() {
    userList.innerHTML = `
      <p class="small muted">
        User management is handled through Cloudflare KV.<br>
        Use the Role Editor to assign roles by user ID.
      </p>
    `;
  }

  applyRoleBtn?.addEventListener("click", async () => {
    const targetUserId = roleUserId.value.trim();
    const newRole = roleSelect.value;

    if (!targetUserId) {
      statusBox.classList.remove("hidden");
      statusBox.textContent = "Enter a user ID.";
      return;
    }

    const res = await api("/api/set-role", "POST", {
      targetSub: targetUserId,
      newRole
    });

    statusBox.classList.remove("hidden");

    if (res.success) {
      statusBox.textContent = `Role updated to "${newRole}"`;
    } else {
      statusBox.textContent = `Error: ${res.message}`;
    }
  });

  function showSection(section) {
    sectionUsers?.classList.add("hidden");
    sectionRoles?.classList.add("hidden");
    sectionLogs?.classList.add("hidden");

    navUsers?.classList.remove("active");
    navRoles?.classList.remove("active");
    navLogs?.classList.remove("active");

    section?.classList.remove("hidden");

    if (section === sectionUsers) navUsers?.classList.add("active");
    if (section === sectionRoles) navRoles?.classList.add("active");
    if (section === sectionLogs) navLogs?.classList.add("active");
  }

  navUsers?.addEventListener("click", () => showSection(sectionUsers));
  navRoles?.addEventListener("click", () => showSection(sectionRoles));
  navLogs?.addEventListener("click", () => showSection(sectionLogs));

  logoutBtn?.addEventListener("click", () => {
    auth0Client.logout({
      logoutParams: { returnTo: window.location.origin }
    });
  });

  backBtn?.addEventListener("click", () => {
    window.location.href = "/index.html";
  });

  const role = await checkAuth();
  if (!role) return;

  const user = await auth0Client.getUser();
  adminUserIndicator.textContent = `${user.email} (${role})`;

  statusBox.classList.remove("hidden");
  statusBox.textContent = "Admin access granted.";

  await loadUsers();
  showSection(sectionUsers);
});
