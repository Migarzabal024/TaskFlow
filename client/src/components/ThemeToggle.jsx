import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle({ variant = "icon" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  if (variant === "sidebar") {
    return (
      <button type="button" className="theme-toggle theme-toggle--sidebar" onClick={toggleTheme}>
        <span className="icon" aria-hidden="true">
          {isDark ? "☀️" : "🌙"}
        </span>
        {isDark ? "Modo claro" : "Modo oscuro"}
      </button>
    );
  }

  return (
    <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={label} title={label}>
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
