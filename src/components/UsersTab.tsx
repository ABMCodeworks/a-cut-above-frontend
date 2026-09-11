import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { api } from "../api/client";
import type {
  AdminPermission,
  AdminUserRecord,
} from "../pages/admin/AdminDashboardPage";

const { Text } = Typography;

type UserForm = {
  name?: string;
  email: string;
  password: string;
  isActive: boolean;
  permissions: AdminPermission[];
};

function hasPermission(
  permissions: AdminPermission[],
  needed: AdminPermission,
) {
  return permissions.includes("admin.full") || permissions.includes(needed);
}

function normalizePermissions(permissions: AdminPermission[] = []): AdminPermission[] {
  return permissions.includes("admin.full") ? ["admin.full"] : permissions;
}

const PERMISSION_GROUPS: {
  title: string;
  items: { label: string; value: AdminPermission }[];
}[] = [
    {
      title: "Everything",
      items: [{ label: "Full admin access", value: "admin.full" }],
    },
    {
      title: "Dashboard",
      items: [{ label: "View dashboard", value: "dashboard.view" }],
    },
    {
      title: "Orders",
      items: [
        { label: "View orders", value: "orders.view" },
        { label: "Update order status", value: "orders.status.update" },
        { label: "Enter/update weights", value: "orders.weights.update" },
        { label: "Delete orders", value: "orders.delete" },
        { label: "Open packing slip / invoice PDFs", value: "packinglists.pdf" },
        { label: "Export packing lists", value: "packinglists.export" },
      ],
    },
    {
      title: "Products",
      items: [
        { label: "View products", value: "products.view" },
        { label: "Manage products", value: "products.manage" },
      ],
    },
    {
      title: "Categories",
      items: [
        { label: "View categories", value: "categories.view" },
        { label: "Manage categories", value: "categories.manage" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "View settings", value: "windows.view" },
        { label: "Manage settings", value: "windows.manage" },
      ],
    },
    {
      title: "Dropoffs",
      items: [
        { label: "View dropoff locations", value: "dropoffs.view" },
        { label: "Manage dropoff locations", value: "dropoffs.manage" },
      ],
    },
    {
      title: "Users",
      items: [
        { label: "View users", value: "users.view" },
        { label: "Manage users", value: "users.manage" },
      ],
    },
    {
      title: "Carcass Weights",
      items: [
        { label: "View carcass weights", value: "carcassweights.view" },
        { label: "Manage carcass weights", value: "carcassweights.manage" },
      ],
    },
    {
      title: "Site Content",
      items: [
        { label: "View site content", value: "content.view" },
        { label: "Manage site content", value: "content.manage" },
      ],
    },
    {
      title: "Privacy Requests",
      items: [
        { label: "View privacy requests", value: "privacy.view" },
        { label: "Manage privacy requests", value: "privacy.manage" },
      ],
    },
  ];

export default function UsersTab({
  loading,
  users,
  currentPermissions,
  onReload,
}: {
  loading: boolean;
  users: AdminUserRecord[];
  currentPermissions: AdminPermission[];
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [form] = Form.useForm<UserForm>();
  const selectedPermissions = Form.useWatch("permissions", form) as AdminPermission[] | undefined;
  const fullAdminSelected = selectedPermissions?.includes("admin.full") ?? false;

  const canManageUsers = hasPermission(currentPermissions, "users.manage");

  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{ path: string; code: string; email: string; expiresAt: string } | null>(null);
  const [invitations, setInvitations] = useState<{ id: string; email: string; expiresAt: string; usedAt: string | null; revokedAt: string | null; attempts: number }[]>([]);
  const [inviteError, setInviteError] = useState("");
  async function loadInvitations() {
    try {
      const { data } = await api.get("/api/admin/users/invitations");
      setInvitations(data.invitations);
      setInviteError("");
    } catch { setInviteError("Could not load invitations. Please retry."); }
  }
  useEffect(() => { if (canManageUsers) void loadInvitations(); }, [canManageUsers]);
  async function revokeInvitation(id: string) {
    try {
      await api.delete(`/api/admin/users/invitations/${id}`);
      await loadInvitations();
      message.success("Invitation revoked");
    } catch { message.error("Could not revoke invitation"); }
  }

  function openCreate() {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      email: "",
      password: "",
      isActive: true,
      permissions: ["orders.view", "orders.weights.update"],
    });
    setOpen(true);
  }

  function openEdit(user: AdminUserRecord) {
    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      name: user.name || "",
      email: user.email,
      password: "",
      isActive: user.isActive,
      permissions: normalizePermissions(user.permissions),
    });
    setOpen(true);
  }

  async function saveUser() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/api/admin/users/${editingUser.id}`, {
          name: values.name?.trim() || null,
          email: values.email.trim(),
          password: values.password?.trim() || undefined,
          isActive: values.isActive,
          permissions: normalizePermissions(values.permissions),
        });
        message.success("User updated");
      } else {
        const { data } = await api.post("/api/admin/users/invitations", {
          name: values.name?.trim() || null,
          email: values.email.trim(),
          permissions: normalizePermissions(values.permissions),
        });
        setInvite(data);
        void loadInvitations();
        message.success("Invitation generated");
      }

      setOpen(false);
      onReload();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to save user");
    } finally { setSaving(false); }
  }

  async function toggleUserActive(user: AdminUserRecord, isActive: boolean) {
    try {
      await api.put(`/api/admin/users/${user.id}`, {
        name: user.name ?? null,
        email: user.email,
        isActive,
        permissions: normalizePermissions(user.permissions),
      });
      message.success(isActive ? "User activated" : "User disabled");
      onReload();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to update user");
    }
  }

  async function deleteUser(user: AdminUserRecord) {
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      message.success("User deleted");
      onReload();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to delete user");
    }
  }

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_: any, u: AdminUserRecord) =>
        u.name || <Text type="secondary">—</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Status",
      key: "isActive",
      width: 120,
      render: (_: any, u: AdminUserRecord) =>
        u.isActive ? <Tag color="green">Active</Tag> : <Tag>Disabled</Tag>,
    },
    {
      title: "Permissions",
      key: "permissions",
      render: (_: any, u: AdminUserRecord) => (
        <Space size={[4, 4]} wrap>
          {u.permissions?.includes("admin.full") ? (
            <Tag color="blue">Full admin access</Tag>
          ) : (u.permissions || []).length === 0 ? (
            <Tag>None</Tag>
          ) : (
            u.permissions.map((p) => <Tag key={p}>{p}</Tag>)
          )}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 240,
      render: (_: any, u: AdminUserRecord) =>
        canManageUsers ? (
          <Space>
            <Button onClick={() => openEdit(u)}>Edit</Button>
            <Switch
              checked={u.isActive}
              onChange={(checked) => toggleUserActive(u, checked)}
            />
            <Popconfirm
              title="Delete this user?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteUser(u)}
            >
              <Button danger>Delete</Button>
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <Card
      title="Users"
      extra={
        canManageUsers ? (
          <Button type="primary" onClick={openCreate}>
            Invite admin
          </Button>
        ) : null
      }
    >
      <Table
        loading={loading}
        rowKey={(r) => r.id}
        dataSource={users}
        columns={columns as any}
        scroll={{ x: 850 }}
      />

      {canManageUsers && <Card size="small" title="Invitations" extra={<Button onClick={loadInvitations}>Refresh</Button>} style={{ marginTop: 24 }}>
        {inviteError && <Alert type="error" title={inviteError} />}
        <Table scroll={{ x: 600 }} rowKey="id" dataSource={invitations} pagination={{ pageSize: 5 }} columns={[
          { title: "Email", dataIndex: "email" },
          { title: "Expires", render: (_, row) => new Date(row.expiresAt).toLocaleString() },
          { title: "Status", render: (_, row) => row.usedAt ? "Accepted" : row.revokedAt ? "Revoked" : row.attempts >= 5 ? "Locked" : new Date(row.expiresAt) <= new Date() ? "Expired" : "Pending" },
          { title: "", render: (_, row) => !row.usedAt && !row.revokedAt && <Popconfirm title="Revoke this invitation?" onConfirm={() => revokeInvitation(row.id)}><Button danger>Revoke</Button></Popconfirm> },
        ]} />
      </Card>}
      <Modal title="Admin invitation ready" open={!!invite} onCancel={() => setInvite(null)} footer={<Button onClick={() => setInvite(null)}>Done</Button>}>
        {invite && <Space direction="vertical" style={{ width: "100%" }}>
          <Alert type="success" showIcon title={`Invitation for ${invite.email}`} />
          <Text>Copy these now. The code is shown only once. Send the link and code separately to the recipient.</Text>
          <Text strong>Invitation link</Text>
          <Typography.Paragraph copyable style={{ wordBreak: "break-all" }}>{new URL(invite.path, window.location.origin).href}</Typography.Paragraph>
          <Text strong>Access code</Text>
          <Typography.Paragraph copyable code>{invite.code}</Typography.Paragraph>
          <Text>Expires: {new Date(invite.expiresAt).toLocaleString()}. Works once. Five incorrect attempts lock the invitation.</Text>
        </Space>}
      </Modal>

      <Modal
        title={editingUser ? "Edit User" : "Invite admin"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={saveUser}
        okText={editingUser ? "Save" : "Generate link and code"}
        confirmLoading={saving}
        width={760}
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input />
          </Form.Item>

          {editingUser ? <>
            <Form.Item name="password" label="New password (optional)" rules={[{ min: 12, message: "Minimum 12 characters" }]}><Input.Password autoComplete="new-password" /></Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </> : <Alert style={{ marginBottom: 16 }} type="info" showIcon title="Generate a link and a separate code. The recipient will choose their own name and password. Both are required to create the account." />}

          <Form.Item
            name="permissions"
            label="Permissions"
            normalize={normalizePermissions}
            extra={fullAdminSelected ? "Full admin access automatically includes every permission. Uncheck it to choose individual permissions." : undefined}
            rules={[
              { required: true, message: "Select at least one permission" },
            ]}
          >
            <Checkbox.Group style={{ width: "100%" }}>
              <div style={{ display: "grid", gap: 14 }}>
                {PERMISSION_GROUPS.filter((group) => !fullAdminSelected || group.items.some((item) => item.value === "admin.full")).map((group) => (
                  <Card key={group.title} size="small" title={group.title}>
                    <div style={{ display: "grid", gap: 8 }}>
                      {group.items.map((item) => (
                        <Checkbox key={item.value} value={item.value}>
                          {item.label}
                        </Checkbox>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
