document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  const showLogin = document.getElementById("show-login");
  const showRegister = document.getElementById("show-register");

  showRegister?.addEventListener("click", () => {
    loginForm?.classList.add("hidden");
    registerForm?.classList.remove("hidden");
    document.getElementById("auth-title").textContent = "Register";
  });

  showLogin?.addEventListener("click", () => {
    registerForm?.classList.add("hidden");
    loginForm?.classList.remove("hidden");
    document.getElementById("auth-title").textContent = "Login";
  });

  document.getElementById("login-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password })
      }).then(r => r.json());

      if (!res.success) {
        document.getElementById("login-status").textContent = res.message;
        return;
      }

      localStorage.setItem("token", res.token);
      window.location.href = "index.html";
    } catch (err) {
      document.getElementById("login-status").textContent = "Network error: " + err.message;
    }
  });

  document.getElementById("register-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password })
      }).then(r => r.json());

      if (!res.success) {
        document.getElementById("register-status").textContent = res.message;
        return;
      }

      document.getElementById("register-status").textContent = "Account created. You can now log in.";
    } catch (err) {
      document.getElementById("register-status").textContent = "Network error: " + err.message;
    }
  });

});
