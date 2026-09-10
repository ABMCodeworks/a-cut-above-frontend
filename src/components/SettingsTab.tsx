import React, { useEffect, useState } from "react";
import { Alert, Anchor, Button, Card, Col, Form, Input, Row, Skeleton, Typography, message } from "antd";
import { api } from "../api/client";
import WindowsTab from "./WindowsTab";
import UsersTab from "./UsersTab";
import PrivacyRequestsTab from "./PrivacyRequestsTab";
import type { AdminPermission, AdminUserRecord, AdminWindow } from "../pages/admin/AdminDashboardPage";

type CompanyDetails = { name: string; address: string; phone: string; email: string; tin: string; vatNumber: string; registrationNumber: string };

export default function SettingsTab({ loading, windows, onReload, permissions, users, active, initialSection }: {
  loading: boolean; windows: AdminWindow[]; onReload: () => void; permissions: AdminPermission[];
  users: AdminUserRecord[]; active: boolean; initialSection?: "users" | "privacy";
}) {
  const can = (permission: AdminPermission) => permissions.includes("admin.full") || permissions.includes(permission);
  const canViewWindows = can("windows.view");
  const canViewUsers = can("users.view");
  const canViewPrivacy = can("privacy.view");
  const canManage = can("windows.manage");
  const sections = [
    ...(canViewWindows ? [{ key: "delivery-note", href: "#settings-delivery-note", title: "Delivery-note details" }, { key: "windows", href: "#settings-windows", title: "Ordering windows" }] : []),
    ...(canViewUsers ? [{ key: "users", href: "#settings-users", title: "Users" }] : []),
    ...(canViewPrivacy ? [{ key: "privacy", href: "#settings-privacy", title: "Privacy requests" }] : []),
  ];
  const [form] = Form.useForm<CompanyDetails>();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const values = Form.useWatch([], form) as CompanyDetails | undefined;

  async function loadDetails() {
    setFetching(true);
    setError("");
    try {
      const { data } = await api.get("/api/admin/settings/delivery-note");
      form.setFieldsValue(data.details);
      setLoaded(true);
    } catch { setError("Could not load delivery-note details. Please retry."); }
    finally { setFetching(false); }
  }
  useEffect(() => { if (canViewWindows) void loadDetails(); }, [canViewWindows]);

  useEffect(() => {
    if (!active) return;
    const id = initialSection ? `settings-${initialSection}` : window.location.hash.slice(1);
    if (!id.startsWith("settings-")) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [active, initialSection, fetching]);

  async function save(details: CompanyDetails) {
    setSaving(true);
    try {
      const { data } = await api.put("/api/admin/settings/delivery-note", details);
      form.setFieldsValue(data.details);
      message.success("Delivery-note details saved");
    } catch (e: any) { message.error(e?.response?.data?.error || "Could not save delivery-note details"); }
    finally { setSaving(false); }
  }

  const previewLines = values ? [values.name, values.address,
    values.phone && `Phone: ${values.phone}`, values.email && `Email: ${values.email}`,
    values.tin && `TIN: ${values.tin}`, values.vatNumber && `VAT: ${values.vatNumber}`,
    values.registrationNumber && `Registration: ${values.registrationNumber}`,
  ].filter(Boolean) : [];
  const singleLine = { pattern: /^[^\r\n]*$/, message: "Use a single line" };

  return <div className="aca-settings">
    <nav className="aca-settings__sidebar" aria-label="Settings sections">
      <Card size="small" title="Settings">
        <Anchor affix={false} offsetTop={96} targetOffset={96} items={sections} />
      </Card>
    </nav>
    <div className="aca-settings__sections">
    {canViewWindows && <section id="settings-delivery-note" aria-label="Delivery-note details">
    <Card title="Delivery-note details">
      <Typography.Paragraph type="secondary">Set the business details printed on individual and bulk delivery notes. Saved changes apply whenever a delivery note is downloaded, including existing orders.</Typography.Paragraph>
      {error && <Alert type="error" showIcon title={error} action={<Button onClick={loadDetails}>Retry</Button>} style={{ marginBottom: 16 }} />}
      {fetching ? <Skeleton active paragraph={{ rows: 6 }} /> : loaded && <Row gutter={[32, 24]}>
        <Col xs={24} lg={15}>
          <Form form={form} layout="vertical" onFinish={save} disabled={!canManage || saving} requiredMark="optional">
            <Form.Item name="name" label="Business name" rules={[{ required: true, whitespace: true, message: "Enter the business name" }, { max: 120 }, singleLine]}><Input maxLength={120} /></Form.Item>
            <Form.Item name="address" label="Business address" rules={[{ max: 300 }, { validator: (_, value) => !value || value.trim().split(/\r?\n/).length <= 5 ? Promise.resolve() : Promise.reject(new Error("Use at most 5 address lines")) }]}><Input.TextArea rows={3} maxLength={300} showCount /></Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}><Form.Item name="phone" label="Phone number" rules={[{ max: 60 }, singleLine]}><Input maxLength={60} /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="email" label="Email address" rules={[{ type: "email", message: "Enter a valid email address" }, { max: 120 }]}><Input maxLength={120} /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="tin" label="TIN" rules={[{ max: 60 }, singleLine]}><Input maxLength={60} /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="vatNumber" label="VAT number" rules={[{ max: 60 }, singleLine]}><Input maxLength={60} /></Form.Item></Col>
            </Row>
            <Form.Item name="registrationNumber" label="Company registration number" rules={[{ max: 60 }, singleLine]}><Input maxLength={60} /></Form.Item>
            {canManage ? <Button type="primary" htmlType="submit" loading={saving}>Save delivery-note details</Button> : <Typography.Text type="secondary">You have read-only access. Ask an administrator with Settings access to make changes.</Typography.Text>}
          </Form>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="Business details preview" style={{ background: "var(--aca-bg)" }}>
            <div style={{ textAlign: "right", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.8, fontSize: 13 }}>
              {previewLines.map((line, index) => <div key={index}>{index === 0 ? <strong>{line}</strong> : line}</div>)}
              {!previewLines.length && <Typography.Text type="secondary">Your business details will appear here.</Typography.Text>}
            </div>
          </Card>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>Blank optional fields are omitted from the PDF. Save your changes before downloading a delivery note.</Typography.Paragraph>
        </Col>
      </Row>}
    </Card>
    </section>}
    {canViewWindows && <section id="settings-windows" aria-label="Ordering windows">
      <WindowsTab loading={loading} windows={windows} onReload={onReload} canManage={canManage} />
    </section>}
    {canViewUsers && <section id="settings-users" aria-label="Users">
      <UsersTab loading={loading} users={users} currentPermissions={permissions} onReload={onReload} />
    </section>}
    {canViewPrivacy && <section id="settings-privacy" aria-label="Privacy requests">
      <PrivacyRequestsTab permissions={permissions} />
    </section>}
    </div>
  </div>;
}
