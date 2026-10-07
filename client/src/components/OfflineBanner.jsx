import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "#c9802b",
        color: "white",
        textAlign: "center",
        padding: "6px 12px",
        fontSize: "0.85rem",
      }}
    >
      Sin conexión a internet. Algunas acciones no van a funcionar hasta que vuelva la conexión.
    </div>
  );
}
