// UNDERHEAT Studio — Feedback System (Auth0 + KV Roles + Worker API)

document.addEventListener("DOMContentLoaded", async () => {

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

  // Handle redirect callback (if returning from login)
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
  // API HELPER
  // ---------------------------------------------------------
  async function api(path, method = "GET", body = null, isForm = false) {
    const token = await getToken();

    const opts = { method, headers: {} };

    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    if (body && !isForm) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else if (body && isForm) {
      opts.body = body;
    }

    // Changed from relative paths (which pointed to local proxy on localhost:5500)
    // to use API_BASE_URL (configured in config.js).
    // On GitHub Pages, this points to either localhost:4000 (local dev) or the Cloudflare Worker (production).
    const url = `${window.API_BASE_URL}${path}`;
    const res = await fetch(url, opts);
    return res.json();
  }

  // ---------------------------------------------------------
  // USER + ROLE LOADING
  // ---------------------------------------------------------
  let currentUser = null;
  let currentRole = "guest";

  async function loadUserRole() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) return;

    currentUser = await auth0Client.getUser();

    const roleRes = await api("/api/role");
    currentRole = roleRes.role || "guest";

    if (["admin", "founder"].includes(currentRole)) {
      document.getElementById("admin-section").classList.remove("hidden");
      loadAdminNotes();
    }
  }

  // ---------------------------------------------------------
  // NAVIGATION BUTTONS
  // ---------------------------------------------------------
  document.getElementById("back-btn").onclick = () => {
    window.location.href = "/index.html";
  };

  document.getElementById("logout-btn").onclick = () => {
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  // ---------------------------------------------------------
  // PRIVATE FEEDBACK
  // ---------------------------------------------------------
  document.getElementById("fb-submit").onclick = async () => {
    const result = await api("/api/feedback/private", "POST", {
      name: document.getElementById("fb-name").value,
      email: document.getElementById("fb-email").value,
      type: document.getElementById("fb-type").value,
      message: document.getElementById("fb-message").value
    });

    const status = document.getElementById("fb-status");
    status.textContent = result.success ? "Sent!" : result.message;

    if (result.success) {
      document.getElementById("fb-name").value = "";
      document.getElementById("fb-email").value = "";
      document.getElementById("fb-message").value = "";
    }
  };

  // ---------------------------------------------------------
  // PUBLIC POST
  // ---------------------------------------------------------
  document.getElementById("pub-submit").onclick = async () => {
    const form = new FormData();
    form.append("author", document.getElementById("pub-author").value);
    form.append("message", document.getElementById("pub-message").value);
    form.append("sensitive", document.getElementById("pub-anonymous").checked);

    const file = document.getElementById("pub-image").files[0];
    if (file) form.append("image", file);

    const result = await api("/api/feedback/public", "POST", form, true);

    const status = document.getElementById("pub-status");
    status.textContent = result.success ? "Posted!" : result.message;

    if (result.success) {
      document.getElementById("pub-author").value = "";
      document.getElementById("pub-message").value = "";
      document.getElementById("pub-image").value = "";
      document.getElementById("pub-anonymous").checked = false;
    }

    loadPublicPosts();
  };

  // ---------------------------------------------------------
  // LOAD PUBLIC POSTS
  // ---------------------------------------------------------
  async function loadPublicPosts() {
    const res = await api("/api/feedback/public");
    const list = document.getElementById("pub-list");
    list.innerHTML = "";

    if (!res.items || res.items.length === 0) {
      list.innerHTML = "<p class='small muted'>No posts yet</p>";
      return;
    }

    res.items.forEach(post => {
      const div = document.createElement("div");
      div.className = "panel small";

      div.innerHTML = `
        <div class="small muted">${post.author} — ${new Date(post.date).toLocaleString()}</div>
        <p>${post.message}</p>
      `;

      if (post.image) {
        const img = document.createElement("img");
        img.src = post.image;
        img.className = "pub-image";
        img.style.maxWidth = "100%";
        div.appendChild(img);
      }

      if (["admin", "founder"].includes(currentRole)) {
        const del = document.createElement("button");
        del.textContent = "Delete";
        del.onclick = async () => {
          await api(`/api/feedback/public/${post.id}`, "DELETE");
          loadPublicPosts();
        };
        div.appendChild(del);
      }

      list.appendChild(div);
    });
  }

  // ---------------------------------------------------------
  // ADMIN NOTES
  // ---------------------------------------------------------
  document.getElementById("admin-submit").onclick = async () => {
    const result = await api("/api/feedback/admin", "POST", {
      message: document.getElementById("admin-message").value
    });

    const status = document.getElementById("admin-status");
    status.textContent = result.success ? "Posted!" : result.message;

    if (result.success) {
      document.getElementById("admin-message").value = "";
    }

    loadAdminNotes();
  };

  async function loadAdminNotes() {
    const res = await api("/api/feedback/admin");
    const list = document.getElementById("admin-list");
    list.innerHTML = "";

    if (!res.items || res.items.length === 0) {
      list.innerHTML = "<p class='small muted'>No notes yet</p>";
      return;
    }

    res.items.forEach(note => {
      const div = document.createElement("div");
      div.className = "panel small";
      div.innerHTML = `
        <div class="small muted">${note.author} — ${new Date(note.date).toLocaleString()}</div>
        <p>${note.message}</p>
      `;
      list.appendChild(div);
    });
  }

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------
  await loadUserRole();
  await loadPublicPosts();
});
