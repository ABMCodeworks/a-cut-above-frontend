import React, { useState } from "react";
import { Alert, Button, Modal, Space, Table, Typography } from "antd";
import { api } from "../api/client";

type Log = { id: string; productName: string; operation: string; stockQtyBefore: number; stockQtyAfter: number; weightKgBefore: string; weightKgAfter: string; partialWeightKgBefore: string; partialWeightKgAfter: string; source: string; actorId?: string; actorName?: string; createdAt: string };
export default function StockAuditLog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  async function load(next = 1) {
    setLoading(true); setError(false);
    try {
      const { data } = await api.get("/api/admin/settings/stock-audit", { params: { page: next } });
      setLogs(data.logs); setCount(data.count); setPage(next);
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  return <>
    <Button onClick={() => { setOpen(true); void load(); }}>Stock audit logs</Button>
    <Modal title="Stock audit logs" open={open} onCancel={() => setOpen(false)} footer={null} width={1100}>
      <Space style={{ marginBottom: 16 }}><Typography.Text type="secondary">All stock changes recorded since auditing was enabled, newest first.</Typography.Text><Button loading={loading} onClick={() => load(1)}>Refresh</Button></Space>
      {error && <Alert type="error" showIcon title="Could not load stock audit logs" action={<Button onClick={() => load(page)}>Retry</Button>} />}
      <Table<Log> rowKey="id" loading={loading} dataSource={error ? [] : logs} scroll={{ x: 950 }} pagination={{ current: page, total: count, pageSize: 50, showSizeChanger: false, onChange: load }} columns={[
        { title: "Time", dataIndex: "createdAt", render: value => new Date(value).toLocaleString() },
        { title: "Product", dataIndex: "productName" },
        { title: "Change", dataIndex: "operation" },
        { title: "Packs before → after", render: (_, log) => `${log.stockQtyBefore} → ${log.stockQtyAfter} (${log.stockQtyAfter - log.stockQtyBefore >= 0 ? "+" : ""}${log.stockQtyAfter - log.stockQtyBefore})` },
        { title: "Processing kg before → after", render: (_, log) => `${Number(log.weightKgBefore)} → ${Number(log.weightKgAfter)}` },
        { title: "Open pack kg used before → after", render: (_, log) => `${Number(log.partialWeightKgBefore)} → ${Number(log.partialWeightKgAfter)}` },
        { title: "Source", dataIndex: "source" },
        { title: "User", dataIndex: "actorName", render: value => value || "Not recorded (database process)" },
      ]} />
    </Modal>
  </>;
}
