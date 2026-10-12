import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Skeleton, Typography, message } from "antd";
import { api } from "../api/client";

const phoneRules = [{ required: true, message: "Enter a phone number" }, { pattern: /^\+[1-9]\d{7,14}$/, message: "Use international format, e.g. +263790246005" }];

export default function WhatsAppSettings({ canManage }: { canManage: boolean }) {
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [savedFrom, setSavedFrom] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const from = Form.useWatch("from", form);
  async function load() {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/api/admin/settings/whatsapp");
      form.setFieldsValue(data.settings); setSavedFrom(data.settings.from);
      setCredentialsConfigured(data.credentialsConfigured); setLoaded(true);
    } catch { setError("Could not load WhatsApp settings."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(values: { from: string }) {
    setSaving(true); setResult(null);
    try {
      const { data } = await api.put("/api/admin/settings/whatsapp", values);
      form.setFieldsValue(data.settings); setSavedFrom(data.settings.from);
      message.success("WhatsApp sender saved");
    } catch (e: any) { message.error(e?.response?.data?.error || "Could not save WhatsApp settings"); }
    finally { setSaving(false); }
  }
  async function test(values: { to: string }) {
    setTesting(true); setResult(null);
    try {
      const { data } = await api.post("/api/admin/settings/whatsapp/test", values);
      setResult({ ok: true, text: `Twilio accepted the test message to ${values.to}. Check WhatsApp for delivery. Message ID: ${data.messageSid}` });
    } catch (e: any) { setResult({ ok: false, text: e?.response?.data?.error || "Could not send the test message" }); }
    finally { setTesting(false); }
  }
  return <Card title="WhatsApp">
    <Typography.Paragraph type="secondary">Choose the Twilio WhatsApp sender used for order updates. The number must be linked to your Twilio account.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={load}>Retry</Button>} />}
    {loading ? <Skeleton active /> : loaded && <>
      {!credentialsConfigured && <Alert type="warning" showIcon title="Twilio account credentials are missing" description="Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN on the server to send messages." style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" onFinish={save} disabled={!canManage || saving || testing}>
        <Form.Item name="from" label="WhatsApp sender number" rules={phoneRules}><Input placeholder="+263790246005" /></Form.Item>
        {canManage && <Button type="primary" htmlType="submit" loading={saving}>Save WhatsApp sender</Button>}
      </Form>
      {canManage ? <Form form={testForm} layout="vertical" onFinish={test} style={{ marginTop: 24 }} disabled={saving || testing}>
        <Typography.Paragraph>Send a test message from {savedFrom} to a WhatsApp recipient. Save sender changes before testing. The recipient may need to message your sender first to open a WhatsApp conversation.</Typography.Paragraph>
        <Form.Item name="to" label="Test recipient number" rules={phoneRules}><Input placeholder="+263…" /></Form.Item>
        <Button htmlType="submit" loading={testing} disabled={!credentialsConfigured || from !== savedFrom}>Send test WhatsApp</Button>
      </Form> : <Typography.Paragraph type="secondary">You have read-only access. Ask an administrator with Settings access to make changes or send a test.</Typography.Paragraph>}
      {result && <Alert type={result.ok ? "success" : "error"} showIcon title={result.text} style={{ marginTop: 16 }} />}
    </>}
  </Card>;
}
