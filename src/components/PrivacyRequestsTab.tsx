import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { api } from "../api/client";
import type { AdminPermission } from "../pages/admin/AdminDashboardPage";

const { Title, Text } = Typography;

type PrivacyRequest = {
  id: string;
  requestNo: string;
  requestType: string;
  name: string;
  contact: string;
  orderNo?: string | null;
  details?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  actionApplied?: string | null;
  identityVerified: boolean;
  resolutionNotes?: string | null;
  createdAt: string;
};

function can(permissions: AdminPermission[], needed: AdminPermission) {
  return permissions.includes("admin.full") || permissions.includes(needed);
}

export default function PrivacyRequestsTab({
  permissions,
}: {
  permissions: AdminPermission[];
}) {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PrivacyRequest | null>(null);
  const [form] = Form.useForm();
  const canManage = can(permissions, "privacy.manage");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/privacy-requests");
      setRequests(res.data?.requests || []);
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Could not load privacy requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(request: PrivacyRequest) {
    setEditing(request);
    form.setFieldsValue({
      status: request.status,
      identityVerified: request.identityVerified,
      resolutionNotes: request.resolutionNotes || "",
    });
  }

  async function save() {
    if (!editing) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await api.patch(`/api/admin/privacy-requests/${editing.id}`, values);
      message.success("Privacy request updated");
      setEditing(null);
      await load();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Could not update request");
    } finally {
      setSaving(false);
    }
  }

  const statusColor: Record<string, string> = {
    OPEN: "red",
    IN_PROGRESS: "gold",
    COMPLETED: "green",
    REJECTED: "default",
  };

  return (
    <Card className="aca-card">
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>Privacy Requests</Title>
          <Text type="secondary">Review access, correction, deletion, objection and consent-withdrawal requests.</Text>
        </div>
        <Button onClick={load} loading={loading}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={requests}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1050 }}
        columns={[
          { title: "Reference", dataIndex: "requestNo", width: 180 },
          {
            title: "Status",
            dataIndex: "status",
            width: 125,
            render: (value) => <Tag color={statusColor[value]}>{String(value).replaceAll("_", " ")}</Tag>,
          },
          { title: "Type", dataIndex: "requestType", width: 180, render: (v) => String(v).replaceAll("_", " ") },
          { title: "Name", dataIndex: "name", width: 160 },
          { title: "Contact", dataIndex: "contact", width: 210 },
          { title: "Order", dataIndex: "orderNo", width: 160, render: (v) => v || "—" },
          { title: "Received", dataIndex: "createdAt", width: 170, render: (v) => new Date(v).toLocaleString() },
          {
            title: "Action",
            fixed: "right",
            width: 110,
            render: (_, request) => <Button size="small" onClick={() => edit(request)}>Review</Button>,
          },
        ]}
        expandable={{
          expandedRowRender: (request) => (
            <div style={{ display: "grid", gap: 6 }}>
              <Text><b>Details:</b> {request.details || "None supplied"}</Text>
              <Text><b>Immediate action:</b> {request.actionApplied || "None"}</Text>
              <Text><b>Resolution:</b> {request.resolutionNotes || "Not recorded"}</Text>
            </div>
          ),
        }}
      />

      <Modal
        title={editing ? `Review ${editing.requestNo}` : "Review request"}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={save}
        okButtonProps={{ loading: saving, disabled: !canManage }}
        okText="Save"
      >
        {editing ? (
          <div style={{ marginBottom: 16, display: "grid", gap: 4 }}>
            <Text><b>{editing.name}</b> · {editing.contact}</Text>
            <Text>Order: {editing.orderNo || "not supplied"}</Text>
            <Text>{editing.details || "No additional details supplied."}</Text>
          </div>
        ) : null}
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[
              { value: "OPEN", label: "Open" },
              { value: "IN_PROGRESS", label: "In progress" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected / cannot fulfil" },
            ]} />
          </Form.Item>
          <Form.Item name="identityVerified" valuePropName="checked">
            <Checkbox>Identity has been appropriately verified</Checkbox>
          </Form.Item>
          <Form.Item name="resolutionNotes" label="Resolution notes">
            <Input.TextArea rows={5} maxLength={4000} />
          </Form.Item>
        </Form>
        {!canManage ? <Text type="secondary">You have view-only access.</Text> : null}
      </Modal>
    </Card>
  );
}

