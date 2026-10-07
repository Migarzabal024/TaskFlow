import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as notificationService from "../services/notificationService";

const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Inicio", icon: "🏠" },
  { to: "/app/tasks", label: "Tareas", icon: "✅" },
  { to: "/app/family", label: "Familia", icon: "👪" },
  { to: "/app/notifications", label: "Avisos", icon: "🔔" },
  { to: "/app/statistics", label: "Stats", icon: "📊" },
  { to: "/app/profile", label: "Perfil", icon: "👤" },
];

export default function AppLayout() {
  const { logout, family } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const notifications = await notificationService.listNotifications();
      setUnreadCount(notifications.filter((n) => !n.readAt).length);
    } catch {
      // el badge no es critico, si falla simplemente no se actualiza
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <nav className="bottom-nav" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav__item${isActive ? " active" : ""}`}
          >
            <span className="icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
            {item.to === "/app/notifications" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="top-bar">
          <span className="top-bar__title">{family?.name ?? "FamilyTask"}</span>
          <div className="top-bar__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate("/app/notifications")}
              aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : "Notificaciones"}
            >
              🔔{unreadCount > 0 ? <span className="badge-dot" /> : null}
            </button>
            <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Cerrar sesión">
              ⎋
            </button>
          </div>
        </header>
        <main className="app-main">
          <Outlet context={{ refreshUnread }} />
        </main>
      </div>
    </div>
  );
}
