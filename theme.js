// ============================================================
// UNDERHEAT STUDIO — GLOBAL THEME LOADER
// Loads saved settings instantly on every page BEFORE render
// ============================================================

const root = document.documentElement;

// Default fallback values
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

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("uh_settings") || "{}");
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

// Apply settings to the page
function applyTheme() {
  const s = loadSettings();

  // Colors
  root.style.setProperty("--primary-color", s.primary);
  root.style.setProperty("--secondary-color", s.secondary);
  root.style.setProperty("--accent-color", s.accent);
  root.style.setProperty("--background-color", s.background);
  root.style.setProperty("--neon-color", s.neon);

  // UI scale
  root.style.setProperty("--ui-scale", s.uiScale);

  // Card + font styles
  document.body.setAttribute("card-style", s.cardStyle);
  document.body.setAttribute("font-style", s.fontStyle);
}

// Sync theme across tabs/pages
window.addEventListener("storage", () => {
  if (localStorage.getItem("uh_settings_updated")) {
    applyTheme();
  }
});

// Apply theme immediately on page load
applyTheme();
