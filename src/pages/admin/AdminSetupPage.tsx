import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { api } from "../../api/client";
import { Link, useLocation } from "../../lib/router";

export default function AdminSetupPage({ initial = false }: { initial?: boolean }) {
  const location = useLocation();
  const token = location.hash.slice(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [setupState, setSetupState] = useState<"checking" | "available" | "closed" | "unavailable">(initial ? "checking" : "available");

  async function checkSetup() {
    setSetupState("checking");
    setError("");
    try {
      const { data } = await api.get("/api/admin/auth/setup-status");
      if (data.available === true) setSetupState("available");
      else if (data.reason === "already_complete") setSetupState("closed");
      else {
        setSetupState("unavailable");
        setError(data.reason === "not_configured"
          ? "Initial setup has not been enabled. The site owner needs to configure the setup code on the backend."
          : "Initial setup is unavailable. An admin account may already exist. Sign in, or ask the site owner to check the setup configuration.");
      }
    } catch {
      setSetupState("unavailable");
      setError("The account service is unavailable. Please try again after the backend is running.");
    }
  }
  useEffect(() => { if (initial) void checkSetup(); }, [initial]);

  async function submit(values: { name: string; email: string; password: string; code: string }) {
    setBusy(true);
    setError("");
    try {
      await api.post(initial ? "/api/admin/auth/setup" : "/api/admin/auth/accept-invitation", {
        name: values.name, email: values.email.trim(), password: values.password, code: values.code.trim(),
        ...(initial ? {} : { token }),
      });
      setDone(true);
      if (!initial) window.history.replaceState(null, "", "/admin/register");
    } catch (e: any) {
      if (initial && e?.response?.status === 409) {
        setSetupState("closed");
      } else {
        setError(e?.response?.data?.error || (e?.response?.status >= 500 || !e?.response
          ? "The account service is unavailable. Please try again after the backend is running."
          : "Could not create your account. Please check your details and try again."));
      }
    } finally {
      setBusy(false);
    }
  }

  return <Card title={initial ? "Set up the first administrator" : "Create your admin account"} style={{ maxWidth: 480, margin: "0 auto" }}>
    {initial && setupState === "checking" ? <Space><Spin /><span>Checking initial setup…</span></Space> :
    initial && setupState === "closed" && !done ? <Space direction="vertical" size="middle">
      <Alert type="info" showIcon title="An administrator has already been set up" description="Initial setup can only run once. Sign in with an existing admin account, or ask an administrator to send you an invitation." />
      <Link to="/admin">Go to admin login</Link>
    </Space> : initial && setupState === "unavailable" ? <Space direction="vertical" size="middle">
      <Alert type="warning" showIcon title={error} />
      <Button onClick={checkSetup}>Check again</Button>
      <Link to="/admin">Go to admin login</Link>
    </Space> : done ? <Space direction="vertical">
      <Alert type="success" showIcon title="Your admin account is ready. Sign in with your new details." />
      <Link to="/admin">Go to admin login</Link>
    </Space> : <>
      <Typography.Paragraph type="secondary">
        {initial
          ? "Enter the setup code configured by the site owner and choose your login details. This setup can only be completed once."
          : "Enter the email address your invitation was created for, the separate access code from your administrator, and your new login details. Invitations expire after 48 hours."}
      </Typography.Paragraph>
      {!initial && !/^[a-f0-9]{64}$/.test(token) ? <Alert type="error" title="Open the complete invitation link provided by your administrator." /> :
        <Form layout="vertical" onFinish={submit}>
          {error && <Alert style={{ marginBottom: 16 }} type="error" showIcon title={error} />}
          <Form.Item name="name" label="Your name" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input autoComplete="name" /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}><Input autoComplete="username" /></Form.Item>
          <Form.Item name="code" label={initial ? "Setup code" : "Invitation code"} rules={[{ required: true }]}><Input.Password autoComplete="off" /></Form.Item>
          <Form.Item name="password" label="New password" extra="At least 12 characters; maximum 72 bytes." rules={[{ required: true }, { min: 12 }, { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72 ? Promise.resolve() : Promise.reject(new Error("Password must be at most 72 bytes")) }]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item name="confirmPassword" label="Confirm password" dependencies={["password"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")); } })]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>Create admin account</Button>
        </Form>}
      <div style={{ marginTop: 16 }}><Link to="/admin">Back to admin login</Link></div>
    </>}
  </Card>;
}
