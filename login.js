document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  const showLogin = document.getElementById("show-login");
  const showRegister = document.getElementById("show-register");

  // Switch to register
  showRegister.onclick = () => {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    document.getElementById("auth-title").textContent = "Register";
  };

  // Switch to login
  showLogin.onclick = () => {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    document.getElementById("auth-title").textContent = "Login";
  };

  // Login
  document.getElementById("login-btn").onclick = async () => {
    const email = login-email.value;
    const password = login-password.value;

    // Changed from relative path /api/auth/login to use configurable API_BASE_URL
    // This allows the frontend to call either the local backend (localhost:4000)
    // or the production backend via environment configuration.
    const res = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());

    if (!res.success) {
      login-status.textContent = res.message;
      return;
    }

    localStorage.setItem("token", res.token);
    window.location.href = "index.html";
  };

  // Register
  document.getElementById("register-btn").onclick = async () => {
    const email = reg-email.value;
    const password = reg-password.value;
    const role = reg-role.value;

    // Changed from relative path /api/auth/register to use configurable API_BASE_URL
    // This allows the frontend to call either the local backend (localhost:4000)
    // or the production backend via environment configuration.
    const res = await fetch(`${window.API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    }).then(r => r.json());

    if (!res.success) {
      register-status.textContent = res.message;
      return;
    }

    register-status.textContent = "Account created. You can now log in.";
  };

});
