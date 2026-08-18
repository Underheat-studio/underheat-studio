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

  // Load settings from unified localStorage key (shared with theme.js)
  // This ensures settings persist across ALL pages
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("uh_settings") || "{}");
      return { ...DEFAULTS, ...saved };
    } catch {
      return { ...DEFAULTS };
    }
  }

  // Save settings to unified localStorage key and apply to page
  function saveSettings(settings) {
    localStorage.setItem("uh_settings", JSON.stringify(settings));
    localStorage.setItem("uh_settings_updated", Date.now());
    applyTheme(settings);
  }

  // Apply settings to the page
  function applyTheme(s = loadSettings()) {
    root.style.setProperty("--primary-color", s.primary);
    root.style.setProperty("--secondary-color", s.secondary);
    root.style.setProperty("--accent-color", s.accent);
    root.style.setProperty("--background-color", s.background);
    root.style.setProperty("--neon-color", s.neon);
    root.style.setProperty("--ui-scale", s.uiScale);
    
    document.body.setAttribute("card-style", s.cardStyle);
    document.body.setAttribute("font-style", s.fontStyle);
  }

  // Initialize UI with saved settings
  function initializeUI() {
    const settings = loadSettings();

    // Color inputs
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

    // Card style
    const cardSelect = document.getElementById("card-style");
    if (cardSelect) {
      cardSelect.value = settings.cardStyle;
      cardSelect.addEventListener("change", (e) => {
        settings.cardStyle = e.target.value;
        saveSettings(settings);
      });
    }

    // Font style
    const fontSelect = document.getElementById("font-style");
    if (fontSelect) {
      fontSelect.value = settings.fontStyle;
      fontSelect.addEventListener("change", (e) => {
        settings.fontStyle = e.target.value;
        saveSettings(settings);
      });
    }

    // UI scale
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

    // Reset button
    const resetBtn = document.getElementById("reset-settings");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        localStorage.removeItem("uh_settings");
        localStorage.setItem("uh_settings_updated", Date.now());
        applyTheme(DEFAULTS);
        initializeUI();
      });
    }
  }

  // Navigation
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  }

  // Load and apply settings on page load
  applyTheme();
  initializeUI();
});
