document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;

  const DEFAULTS = {
    primary: "#ff5500",
    secondary: "#333333",
    accent: "#ff5500",
    background: "#1a1a1a",
    neon: "#00ffff",
    cardStyle: "glass",
    fontStyle: "modern",
    uiScale: "1"
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("uh_settings") || "{}");
      return { ...DEFAULTS, ...saved };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem("uh_settings", JSON.stringify(settings));
    localStorage.setItem("uh_settings_updated", Date.now());
    applyTheme(settings);
    showSaveToast();
  }

  function applyTheme(s = loadSettings()) {
    root.style.setProperty("--primary-color", s.primary);
    root.style.setProperty("--secondary-color", s.secondary);
    root.style.setProperty("--accent-color", s.accent);
    root.style.setProperty("--background-color", s.background);
    root.style.setProperty("--neon-color", s.neon);
    root.style.setProperty("--ui-scale", s.uiScale);

    root.setAttribute("card-style", s.cardStyle);
    root.setAttribute("font-style", s.fontStyle);
  }

  let toastTimer = null;
  function showSaveToast() {
    let toast = document.getElementById("save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "save-toast";
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: #00ff99; color: #000; padding: 12px 20px;
        border-radius: 8px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(0,255,153,0.3);
        opacity: 0; transform: translateY(10px);
        transition: opacity 0.3s, transform 0.3s; z-index: 9999;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = "Settings saved";
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 2000);
  }

  function initializeUI() {
    const settings = loadSettings();

    const colorMap = {
      "primary-color": "primary",
      "secondary-color": "secondary",
      "accent-color": "accent",
      "background-color": "background",
      "neon-color": "neon"
    };

    Object.entries(colorMap).forEach(([inputId, key]) => {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(inputId + "-preview");
      if (input) {
        input.value = settings[key];
        input.addEventListener("input", (e) => {
          settings[key] = e.target.value;
          saveSettings(settings);
          if (preview) preview.style.backgroundColor = e.target.value;
        });
        if (preview) preview.style.backgroundColor = settings[key];
      }
    });

    const cardSelect = document.getElementById("card-style");
    if (cardSelect) {
      cardSelect.value = settings.cardStyle;
      cardSelect.addEventListener("change", (e) => {
        settings.cardStyle = e.target.value;
        saveSettings(settings);
      });
    }

    const fontSelect = document.getElementById("font-style");
    if (fontSelect) {
      fontSelect.value = settings.fontStyle;
      fontSelect.addEventListener("change", (e) => {
        settings.fontStyle = e.target.value;
        saveSettings(settings);
      });
    }

    const scaleInput = document.getElementById("ui-scale");
    const scaleLabel = document.getElementById("scale-label");
    if (scaleInput) {
      scaleInput.value = settings.uiScale;
      if (scaleLabel) scaleLabel.textContent = Math.round(settings.uiScale * 100) + "%";
      scaleInput.addEventListener("input", (e) => {
        settings.uiScale = e.target.value;
        saveSettings(settings);
        if (scaleLabel) scaleLabel.textContent = Math.round(e.target.value * 100) + "%";
      });
    }

    const resetBtn = document.getElementById("reset-settings");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        localStorage.removeItem("uh_settings");
        localStorage.setItem("uh_settings_updated", Date.now());
        applyTheme(DEFAULTS);
        initializeUI();
        showSaveToast();
      });
    }
  }

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (window.auth0Client) {
        window.auth0Client.logout({
          logoutParams: { returnTo: window.location.origin }
        });
      } else {
        window.location.href = "index.html";
      }
    });
  }

  applyTheme();
  initializeUI();
});
