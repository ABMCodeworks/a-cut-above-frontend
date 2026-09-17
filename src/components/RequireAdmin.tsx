import { useEffect, useState, type ReactNode } from "react";
import { Spin } from "antd";
import { api } from "../api/client";
import { useNavigate } from "../lib/router";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/api/admin/me")
      .then(({ data }) => {
        if (!active) return;
        if (data?.ok === true && data?.user?.id) setAuthenticated(true);
        else navigate("/admin", { replace: true });
      })
      .catch(() => {
        if (active) navigate("/admin", { replace: true });
      });
    return () => { active = false; };
  }, [navigate]);

  return authenticated ? children : <Spin aria-label="Checking staff access" />;
}
