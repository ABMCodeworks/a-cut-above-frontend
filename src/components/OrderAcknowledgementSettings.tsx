import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Skeleton, Typography, message } from "antd";
import { api } from "../api/client";

type Acknowledgement = { title: string; text: string };

export default function OrderAcknowledgementSettings({ canManage }: { canManage: boolean }) {
  const [form] = Form.useForm<Acknowledgement>();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const values = Form.useWatch([], form) as Acknowledgement | undefined;

  async function load() {
    setFetching(true);
    setError(false);
    try {
      const { data } = await api.get("/api/admin/settings/order-acknowledgement");
      form.setFieldsValue(data.content);
    } catch { setError(true); }
    finally { setFetching(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(content: Acknowledgement) {
    setSaving(true);
    try {
      const { data } = await api.put("/api/admin/settings/order-acknowledgement", content);
      form.setFieldsValue(data.content);
      message.success("Order acknowledgement saved");
    } catch (e: any) { message.error(e?.response?.data?.error || "Could not save order acknowledgement"); }
    finally { setSaving(false); }
  }

  return <Card title="Order acknowledgement">
    <Typography.Paragraph type="secondary">Edit the message customers see after placing an order. Saved changes apply to future checkout confirmations.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title="Could not load order acknowledgement." action={<Button onClick={load}>Retry</Button>} />}
    {fetching ? <Skeleton active /> : !error && <>
      <Form form={form} layout="vertical" onFinish={save} disabled={!canManage || saving}>
        <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }, { max: 200 }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="text" label="Message" rules={[{ required: true, whitespace: true }, { max: 5000 }]}><Input.TextArea autoSize={{ minRows: 7, maxRows: 16 }} maxLength={5000} showCount /></Form.Item>
        {canManage ? <Button type="primary" htmlType="submit" loading={saving}>Save order acknowledgement</Button> : <Typography.Text type="secondary">You have read-only access.</Typography.Text>}
      </Form>
      <Card size="small" title="Preview" style={{ marginTop: 24 }}>
        <Typography.Text strong>{values?.title}</Typography.Text>
        <Typography.Paragraph style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 12 }}>{values?.text}</Typography.Paragraph>
      </Card>
    </>}
  </Card>;
}
