import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
  const { user, family, isLeader, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="stack">
      <h1>Perfil</h1>
      <div className="card stack">
        <div>
          <label>Nombre</label>
          <p>{user?.name}</p>
        </div>
        <div>
          <label>Email</label>
          <p>{user?.email}</p>
        </div>
        <div>
          <label>Familia</label>
          <p>
            {family?.name} · {isLeader ? "Líder" : "Integrante"}
          </p>
        </div>
      </div>
      <button type="button" className="btn btn-danger btn-block" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}
