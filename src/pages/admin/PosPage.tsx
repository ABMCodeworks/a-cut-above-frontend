import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { api } from "../../api/client";
import PointOfSaleTab from "../../components/PointOfSaleTab";
import logo from "../../assets/logo.webp";

export default function PosPage() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/api/pos/me").then(({ data }) => { if (active) setUser(data.user); }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  async function login(values: { username: string; password: string }) {
    setSaving(true); setError("");
    try { await api.post("/api/pos/auth/login", values); const { data } = await api.get("/api/pos/me"); setUser(data.user); }
    catch (e: any) { setError(e.response?.data?.error || "Could not sign in. Please retry."); }
    finally { setSaving(false); }
  }
  async function logout() {
    setSaving(true); setError("");
    try { await api.post("/api/pos/auth/logout"); setUser(null); }
    catch { setError("Could not sign out. Please retry."); }
    finally { setSaving(false); }
  }
  if (checking) return <Spin aria-label="Checking POS session" />;
  if (user) return <>
    <Space style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><Typography.Title level={2} style={{ margin: 0 }}>Point of Sale</Typography.Title><Space><span>{user.username}</span><Button onClick={logout} loading={saving}>Sign out</Button></Space></Space>
    {error && <Alert type="error" title={error} />}
    <PointOfSaleTab apiPath="/api/pos" onCompleted={() => {}} onSessionExpired={() => { setUser(null); setError("Your POS session expired. Sign in again."); }} />
  </>;
  return <Card title="POS sign in" style={{ maxWidth: 440, margin: "48px auto" }}>
    <img src={logo} alt="A Cut Above Meats" style={{ display: "block", width: 160, maxWidth: "100%", height: "auto", margin: "0 auto 24px" }} />
    <Typography.Paragraph>Sign in with your POS username or admin email and password.</Typography.Paragraph>
    <Form layout="vertical" onFinish={login} disabled={saving}>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Form.Item name="username" label="Username or admin email" rules={[{ required: true }]}><Input autoComplete="username" autoCapitalize="none" spellCheck={false} /></Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item>
      <Button block type="primary" htmlType="submit" loading={saving}>Sign in to POS</Button>
    </Form>
  </Card>;
}
