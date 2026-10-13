import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Collapse, Form, Input, InputNumber, Row, Skeleton, Space, Typography, message } from "antd";
import { api } from "../api/client";

const phoneRules = [{ required: true, message: "Enter a phone number" }, { pattern: /^\+[1-9]\d{7,14}$/, message: "Use international format, e.g. +263790246005" }];
const types = [{ key: "received", label: "Order received" }, { key: "packed", label: "Order packed" }, { key: "delivered", label: "Order delivered" }] as const;
type MessageType = typeof types[number]["key"];
type Settings = { from: string; receivedSid: string; packedSid: string; deliveredSid: string };
type Result = { contentSid?: string; messageSid?: string; status?: string; errorCode?: number; errorMessage?: string; body?: string; error?: string; variables?: Record<string, string> };

export default function WhatsAppSettings({ canManage }: { canManage: boolean }) {
  const [form] = Form.useForm<Settings>();
  const [testForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<MessageType | null>(null);
  const [checking, setChecking] = useState<MessageType | null>(null);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [results, setResults] = useState<Partial<Record<MessageType, Result>>>({});
  const current = Form.useWatch([], form);
  const dirty = !saved || Object.keys(saved).some(key => current?.[key] !== saved[key as keyof Settings]);
  async function load() {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/api/admin/settings/whatsapp");
      form.setFieldsValue(data.settings); setSaved(data.settings);
      setCredentialsConfigured(data.credentialsConfigured); setLoaded(true);
    } catch { setError("Could not load WhatsApp settings."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(values: Settings) {
    setSaving(true);
    try {
      const { data } = await api.put("/api/admin/settings/whatsapp", values);
      form.setFieldsValue(data.settings); setSaved(data.settings);
      message.success("WhatsApp settings saved");
    } catch (e: any) { message.error(e?.response?.data?.error || "Could not save WhatsApp settings"); }
    finally { setSaving(false); }
  }
  async function test(type: MessageType) {
    let values;
    try { values = await testForm.validateFields(type === "received" ? ["to"] : undefined); } catch { return; }
    setTesting(type);
    setResults(previous => ({ ...previous, [type]: undefined }));
    try {
      const { data } = await api.post("/api/admin/settings/whatsapp/test", { ...values, type });
      setResults(previous => ({ ...previous, [type]: data }));
    } catch (e: any) { setResults(previous => ({ ...previous, [type]: { error: e?.response?.data?.error || "Could not send the test message" } })); }
    finally { setTesting(null); }
  }
  async function check(type: MessageType) {
    const sid = results[type]?.messageSid;
    if (!sid) return;
    setChecking(type);
    try {
      const { data } = await api.get(`/api/admin/settings/whatsapp/messages/${sid}`);
      setResults(previous => ({ ...previous, [type]: { ...previous[type], ...data } }));
    } catch (e: any) { message.error(e?.response?.data?.error || "Could not check delivery status"); }
    finally { setChecking(null); }
  }
  return <Card title="WhatsApp">
    <Typography.Paragraph type="secondary">Set your Twilio WhatsApp sender and approved Content SIDs. Saved templates are used for customer order updates.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={load}>Retry</Button>} />}
    {loading ? <Skeleton active /> : loaded && <>
      {!credentialsConfigured && <Alert type="warning" showIcon title="Twilio account credentials are missing" description="Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN on the server to send messages." style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" onFinish={save} disabled={!canManage || saving || Boolean(testing)}>
        <Form.Item name="from" label="WhatsApp sender number" rules={phoneRules}><Input placeholder="+263790246005" /></Form.Item>
        {types.map(({ key, label }) => <Form.Item key={key} name={`${key}Sid`} label={`${label} — Content SID`} rules={[{ pattern: /^(HX[0-9a-fA-F]{32})?$/, message: "Enter a Content SID: HX followed by 32 hexadecimal characters" }]}><Input placeholder="HX…" /></Form.Item>)}
        <Typography.Paragraph type="secondary">The order received template has no variables. For packed and delivered templates, use {'{{1}}'} = first name, {'{{2}}'} = surname, {'{{3}}'} = order number, and {'{{4}}'} = total for the packed message. Put a space between the name placeholders: {'Hi {{1}} {{2}},'}. Each message requires its saved, approved Content SID. No plain-text fallback is sent.</Typography.Paragraph>
        {canManage && <Button type="primary" htmlType="submit" loading={saving}>Save WhatsApp settings</Button>}
      </Form>
      {canManage ? <Collapse style={{ marginTop: 16 }} items={[{ key: "tests", label: "Test order WhatsApp messages", children: <>
        <Form form={testForm} layout="vertical" initialValues={{ firstName: "John", surname: "Doe", orderNo: "TEST-1001", total: 45 }} disabled={saving || Boolean(testing)}>
          <Typography.Paragraph type="secondary">Save settings before testing. Received only needs a recipient; packed and delivered use the sample order. Tests do not change orders.</Typography.Paragraph>
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="to" label="Test recipient" rules={phoneRules}><Input placeholder="+263…" /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="orderNo" label="Order number" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={12} sm={8}><Form.Item name="firstName" label="First name" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={12} sm={8}><Form.Item name="surname" label="Surname" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="total" label="Total (USD, packed only)" rules={[{ required: true }]}><InputNumber min={0} max={1000000} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
        </Form>
        <Space wrap style={{ marginBottom: 12 }}>
          {types.map(({ key, label }) => <Button key={key} onClick={() => test(key)} loading={testing === key} disabled={!credentialsConfigured || dirty || !saved?.[`${key}Sid`] || saving || Boolean(testing)}>Test {label.toLowerCase()}</Button>)}
        </Space>
        {types.some(({ key }) => !saved?.[`${key}Sid`]) && <Typography.Paragraph type="secondary">Save an approved Content SID for each message to enable its test.</Typography.Paragraph>}
        <Space orientation="vertical" style={{ width: "100%" }}>
          {types.map(({ key, label }) => {
            const result = results[key];
            if (!result) return null;
            const failed = result?.error || result?.errorCode || result?.status === "failed" || result?.status === "undelivered";
            return <Card key={key} size="small" title={label}>
              <Alert showIcon type={failed ? "error" : ["delivered", "read"].includes(result.status || "") ? "success" : "info"} title={result.error || `Twilio status: ${result.status || "accepted"}`} description={<>
                {result.contentSid && <div>Template used: {result.contentSid}</div>}
                {result.messageSid && <div>Message ID: {result.messageSid}</div>}
                {result.errorCode && <div>Error {result.errorCode}: {result.errorMessage || "Delivery failed"}{result.errorCode === 63016 && " — check that the Content SID is approved for WhatsApp."}</div>}
                {result.body && <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{result.body}</Typography.Paragraph>}
                {result.messageSid && <><Typography.Paragraph>Queued or sent does not confirm delivery. Check again after a few seconds; the received message in WhatsApp shows the final wording.</Typography.Paragraph><Button onClick={() => check(key)} loading={checking === key}>Check delivery status</Button></>}
              </>} />
            </Card>;
          })}
        </Space>
      </> }]} /> : <Typography.Paragraph type="secondary">You have read-only access. Ask an administrator with Settings access to make changes or send a test.</Typography.Paragraph>}
    </>}
  </Card>;
}
