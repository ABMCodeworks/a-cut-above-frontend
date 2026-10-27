import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, message } from "antd";
import { api } from "../api/client";
import { Link } from "../lib/router";

type User = { id: string; username: string; isActive: boolean };
export default function PosUsers({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ username: string; password?: string }>();
  async function load() {
    setLoading(true);
    try { const { data } = await api.get("/api/admin/pos-users"); setUsers(data.users); setError(""); }
    catch { setError("Could not load POS users. Please retry."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function edit(user: User | null) { setEditing(user); form.resetFields(); form.setFieldsValue({ username: user?.username || "" }); setOpen(true); }
  async function save() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const data = { username: values.username, password: values.password || undefined };
      if (editing) await api.put(`/api/admin/pos-users/${editing.id}`, data);
      else await api.post("/api/admin/pos-users", data);
      setOpen(false); message.success(editing ? "POS user updated" : "POS user created"); await load();
    } catch (e: any) { message.error(e.response?.data?.error || "Could not save POS user"); }
    finally { setSaving(false); }
  }
  async function update(user: User, isActive: boolean) {
    try { await api.put(`/api/admin/pos-users/${user.id}`, { isActive }); await load(); }
    catch { message.error("Could not update POS user"); }
  }
  async function remove(user: User) {
    try { await api.delete(`/api/admin/pos-users/${user.id}`); await load(); }
    catch { message.error("Could not delete POS user"); }
  }
  return <Card title="POS users" style={{ marginTop: 24 }} extra={<Space><Button onClick={load}>Refresh</Button>{canManage && <Button type="primary" onClick={() => edit(null)}>Create POS user</Button>}</Space>}>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} title={<>POS users sign in at <Link to="/sales/pos">/sales/pos</Link> with a username and password. They can record sales and have no admin access.</>} />
    {error && <Alert type="error" title={error} />}
    <Table loading={loading} dataSource={users} rowKey="id" scroll={{ x: 500 }} columns={[
      { title: "Username", dataIndex: "username" },
      { title: "Status", render: (_, user) => user.isActive ? "Active" : "Disabled" },
      { title: "", render: (_, user) => canManage && <Space><Button onClick={() => edit(user)}>Edit / reset password</Button><Switch aria-label={`Activate ${user.username}`} checked={user.isActive} onChange={value => update(user, value)} /><Popconfirm title="Delete this POS user?" onConfirm={() => remove(user)}><Button danger>Delete</Button></Popconfirm></Space> },
    ]} />
    <Modal title={editing ? "Edit POS user" : "Create POS user"} open={open} onCancel={() => setOpen(false)} onOk={save} confirmLoading={saving} okText={editing ? "Save" : "Create user"}>
      <Form form={form} layout="vertical">
        <Form.Item name="username" label="Username" rules={[{ required: true }, { pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}$/, message: "Use 3–40 letters, digits, dots, hyphens or underscores" }]}><Input autoComplete="off" autoCapitalize="none" /></Form.Item>
        <Form.Item name="password" label={editing ? "New password (leave blank to keep current)" : "Password"} rules={[{ required: !editing }, { min: 12, message: "Use at least 12 characters" }, { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72 ? Promise.resolve() : Promise.reject(new Error("Maximum 72 bytes")) }]}><Input.Password autoComplete="new-password" /></Form.Item>
        {editing && <Alert type="info" title="Saving changes signs this user out of existing POS sessions." />}
      </Form>
    </Modal>
  </Card>;
}
