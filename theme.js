// ============================================================
// UNDERHEAT STUDIO — GLOBAL THEME LOADER
// Loads saved settings instantly on every page BEFORE render
// ============================================================

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

function applyTheme() {
  const s = loadSettings();

  root.style.setProperty("--primary-color", s.primary);
  root.style.setProperty("--secondary-color", s.secondary);
  root.style.setProperty("--accent-color", s.accent);
  root.style.setProperty("--background-color", s.background);
  root.style.setProperty("--neon-color", s.neon);
  root.style.setProperty("--ui-scale", s.uiScale);

  root.setAttribute("card-style", s.cardStyle);
  root.setAttribute("font-style", s.fontStyle);
}

window.addEventListener("storage", () => {
  if (localStorage.getItem("uh_settings_updated")) {
    applyTheme();
  }
});

applyTheme();
