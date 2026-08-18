// UNDERHEAT Studio — Feedback System (Auth0 + Supabase)

const FOUNDER_AUTH0_ID = "google-oauth2|113043894566831592879";

document.addEventListener("DOMContentLoaded", async () => {

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

  let currentUser = null;
  let currentRole = "guest";

  async function loadUserRole() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) return;

    currentUser = await auth0Client.getUser();

    // Client-side founder check
    const token = await getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.sub === FOUNDER_AUTH0_ID) {
          currentRole = "founder";
        }
      } catch (e) {
        console.warn("Could not decode token:", e);
      }
    }

    // Try backend for role if not already founder
    if (currentRole !== "founder" && token) {
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/role`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role) currentRole = data.role;
        }
      } catch (err) {
        console.error("Failed to fetch role:", err.message);
      }
    }

    if (["admin", "founder"].includes(currentRole)) {
      document.getElementById("admin-section").classList.remove("hidden");
      loadAdminNotes();
    }
  }

  // Navigation
  document.getElementById("back-btn").onclick = () => {
    window.location.href = "/index.html";
  };

  document.getElementById("logout-btn").onclick = () => {
    auth0Client.logout({
      logoutParams: { returnTo: window.location.origin }
    });
  };

  // Private feedback → Supabase
  document.getElementById("fb-submit").onclick = async () => {
    const name = document.getElementById("fb-name").value.trim();
    const email = document.getElementById("fb-email").value.trim();
    const type = document.getElementById("fb-type").value;
    const message = document.getElementById("fb-message").value.trim();

    if (!message) {
      showStatus("fb-status", "Please enter a message.", "err");
      return;
    }

    try {
      const { error } = await window.supabase
        .from("private_feedback")
        .insert({ name, email, feedback_type: type, message });

      if (error) throw error;

      showStatus("fb-status", "Feedback sent! Thank you.", "ok");
      document.getElementById("fb-name").value = "";
      document.getElementById("fb-email").value = "";
      document.getElementById("fb-message").value = "";
    } catch (err) {
      showStatus("fb-status", "Failed to send: " + err.message, "err");
    }
  };

  // Public post → Supabase
  document.getElementById("pub-submit").onclick = async () => {
    const author = document.getElementById("pub-author").value.trim();
    const message = document.getElementById("pub-message").value.trim();
    const isAnonymous = document.getElementById("pub-anonymous").checked;
    const fileInput = document.getElementById("pub-image");

    if (!message) {
      showStatus("pub-status", "Please enter a message.", "err");
      return;
    }

    let imageUrl = null;

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        showStatus("pub-status", "Unsupported image type.", "err");
        return;
      }

      const ext = file.name.split(".").pop();
      const fileName = `posts/${Date.now()}.${ext}`;

      try {
        const { error: uploadErr } = await window.supabase.storage
          .from("feedback")
          .upload(fileName, file, { contentType: file.type });

        if (uploadErr) throw uploadErr;

        imageUrl = `${SUPABASE_URL}/storage/v1/object/public/feedback/${fileName}`;
      } catch (err) {
        showStatus("pub-status", "Image upload failed: " + err.message, "err");
        return;
      }
    }

    try {
      const { error } = await window.supabase
        .from("public_posts")
        .insert({
          author: isAnonymous ? "Anonymous" : (author || "Anonymous"),
          message,
          image_url: imageUrl,
          is_anonymous: isAnonymous
        });

      if (error) throw error;

      showStatus("pub-status", "Posted to the wall!", "ok");
      document.getElementById("pub-author").value = "";
      document.getElementById("pub-message").value = "";
      document.getElementById("pub-image").value = "";
      document.getElementById("pub-anonymous").checked = false;
      loadPublicPosts();
    } catch (err) {
      showStatus("pub-status", "Failed to post: " + err.message, "err");
    }
  };

  // Load public posts from Supabase
  async function loadPublicPosts() {
    const list = document.getElementById("pub-list");

    try {
      const { data, error } = await window.supabase
        .from("public_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No posts yet. Be the first to share!</p></div>';
        return;
      }

      list.innerHTML = "";
      data.forEach(post => {
        const div = document.createElement("div");
        div.className = "post-card";

        const author = post.author || "Anonymous";
        const time = new Date(post.created_at).toLocaleString();

        div.innerHTML = `
          <div class="post-header">
            <span class="post-author">${escapeHtml(author)}</span>
            <span class="post-time">${time}</span>
          </div>
          <p class="post-message">${escapeHtml(post.message)}</p>
        `;

        if (post.image_url) {
          const img = document.createElement("img");
          img.src = post.image_url;
          img.className = "post-image";
          img.alt = "Attached image";
          div.appendChild(img);
        }

        if (["admin", "founder"].includes(currentRole)) {
          const del = document.createElement("button");
          del.textContent = "Delete";
          del.className = "post-delete";
          del.onclick = async () => {
            try {
              const { error } = await window.supabase
                .from("public_posts")
                .delete()
                .eq("id", post.id);
              if (error) throw error;
              loadPublicPosts();
            } catch (err) {
              alert("Delete failed: " + err.message);
            }
          };
          div.appendChild(del);
        }

        list.appendChild(div);
      });
    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p>Failed to load posts.</p></div>';
      console.error("Load posts error:", err);
    }
  }

  // Admin notes → Supabase
  document.getElementById("admin-submit").onclick = async () => {
    const message = document.getElementById("admin-message").value.trim();

    if (!message) {
      showStatus("admin-status", "Please enter a note.", "err");
      return;
    }

    const author = currentUser?.email || "Admin";

    try {
      const { error } = await window.supabase
        .from("admin_notes")
        .insert({ author, message });

      if (error) throw error;

      showStatus("admin-status", "Note posted!", "ok");
      document.getElementById("admin-message").value = "";
      loadAdminNotes();
    } catch (err) {
      showStatus("admin-status", "Failed to post note: " + err.message, "err");
    }
  };

  async function loadAdminNotes() {
    const list = document.getElementById("admin-list");

    try {
      const { data, error } = await window.supabase
        .from("admin_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No notes yet.</p></div>';
        return;
      }

      list.innerHTML = "";
      data.forEach(note => {
        const div = document.createElement("div");
        div.className = "admin-note";
        div.innerHTML = `
          <div class="post-header">
            <span class="post-author" style="color: var(--neon-color)">${escapeHtml(note.author || "Admin")}</span>
            <span class="post-time">${new Date(note.created_at).toLocaleString()}</span>
          </div>
          <p class="post-message">${escapeHtml(note.message)}</p>
        `;
        list.appendChild(div);
      });
    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p>Failed to load notes.</p></div>';
    }
  }

  // Helpers
  function showStatus(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = "small " + (type === "ok" ? "ok" : type === "err" ? "err" : "muted");
    setTimeout(() => { el.textContent = ""; }, 4000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  await loadUserRole();
  await loadPublicPosts();
});
