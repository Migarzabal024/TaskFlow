import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="auth-screen">
      <div className="auth-card stack" style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p className="text-muted">Esta página no existe.</p>
        <Link to="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
