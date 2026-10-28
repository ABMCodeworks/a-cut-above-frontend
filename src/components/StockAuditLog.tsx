import React, { useRef, useState } from "react";
import { Alert, Button, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { api } from "../api/client";

type Log = {
  id: string; productId: string; productName: string; operation: string;
  stockQtyBefore: number; stockQtyAfter: number;
  weightKgBefore: string; weightKgAfter: string; partialWeightKgBefore: string; partialWeightKgAfter: string;
  source: string; actorId?: string; actorName?: string; createdAt: string;
  orderId?: string | null; orderNo?: string | null; orderExists?: boolean;
  reason?: string | null; orderQtyBefore?: string | null; orderQtyAfter?: string | null;
  stockHandling?: string | null; relatedRecordType?: string | null; relatedRecordId?: string | null;
};
const handlingLabels: Record<string, string> = {
  UNAVAILABLE: "Unavailable / missing", POS_REVERSAL: "POS sale reversed", RETURN_TO_STOCK: "Returned to stock", RESERVED: "Reserved for order",
  SOLD: "Sold", NO_STOCK_CHANGE: "No stock movement",
};
const recordLabels: Record<string, string> = {
  POS_REVERSAL: "POS reversal", ORDER: "Order", PRODUCT: "Product", WASTE: "Waste record", MANUFACTURING_BATCH: "Manufacturing batch",
  PROCESSING_BATCH: "Processing batch", CARCASS_BATCH: "Carcass batch",
};
const copyId = (value?: string | null) => value ? <Typography.Text copyable>{value}</Typography.Text> : "—";
export default function StockAuditLog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const requestId = useRef(0);
  async function load(next = 1, query = search) {
    const id = ++requestId.current;
    setLoading(true); setError(false);
    try {
      const { data } = await api.get("/api/admin/settings/stock-audit", { params: { page: next, q: query || undefined } });
      if (id !== requestId.current) return;
      setLogs(data.logs); setCount(data.count); setPage(next);
    } catch { if (id === requestId.current) setError(true); }
    finally { if (id === requestId.current) setLoading(false); }
  }
  return <>
    <Button onClick={() => { setOpen(true); void load(); }}>Stock audit logs</Button>
    <Modal title="Stock audit logs" open={open} onCancel={() => setOpen(false)} footer={null} width={1400}>
      <Space wrap style={{ marginBottom: 16 }}><Typography.Text type="secondary">Stock movements and order quantity changes, newest first. Expand a row for record IDs and weight balances. Older entries may have no reason or order details.</Typography.Text><Button loading={loading} onClick={() => load(1)}>Refresh</Button></Space>
      <Input.Search
        aria-label="Search stock audit logs by product name"
        placeholder="Search by product name"
        allowClear enterButton="Search" maxLength={200} value={searchInput}
        onChange={event => setSearchInput(event.target.value)}
        onSearch={value => { const query = value.trim(); setSearch(query); void load(1, query); }}
        style={{ marginBottom: 16 }}
      />
      {error && <Alert type="error" showIcon title="Could not load stock audit logs" action={<Button onClick={() => load(page)}>Retry</Button>} />}
      <Table<Log>
        rowKey="id" loading={loading} dataSource={error ? [] : logs}
        locale={{ emptyText: search ? "No audit entries found for this product search." : "No stock audit entries recorded yet." }}
        scroll={{ x: 1500 }} pagination={{ current: page, total: count, pageSize: 50, showSizeChanger: false, onChange: next => { void load(next); } }}
        expandable={{ expandedRowRender: log => <div style={{ display: "grid", gap: 8, overflowWrap: "anywhere" }}>
          <div><strong>Event:</strong> {log.operation === "ORDER_CHANGE" ? "Order change — no stock movement" : log.operation}</div>
          <div><strong>Reason:</strong> {log.reason || "Not recorded"}</div>
          <div><strong>Order ID:</strong> {copyId(log.orderId)} {log.orderId && !log.orderExists && <Typography.Text type="secondary">(order no longer available)</Typography.Text>}</div>
          <div><strong>Related record:</strong> {log.relatedRecordType ? `${recordLabels[log.relatedRecordType] || log.relatedRecordType} — ` : ""}{copyId(log.relatedRecordId)}</div>
          <div><strong>Product ID:</strong> {copyId(log.productId)}</div>
          <div><strong>Processing kg before → after:</strong> {Number(log.weightKgBefore)} → {Number(log.weightKgAfter)}</div>
          <div><strong>Open pack kg used before → after:</strong> {Number(log.partialWeightKgBefore)} → {Number(log.partialWeightKgAfter)}</div>
          <div><strong>Source:</strong> {log.source}</div>
        </div> }}
        columns={[
          { title: "Time", dataIndex: "createdAt", width: 170, render: value => new Date(value).toLocaleString() },
          { title: "Product", dataIndex: "productName", width: 180 },
          { title: "Reason", dataIndex: "reason", width: 280, render: value => value || "Not recorded" },
          { title: "Order", width: 180, render: (_, log) => log.orderId && log.orderExists ? <Typography.Link href={`/admin/dashboard?tab=orders&orderId=${encodeURIComponent(log.orderId)}`} target="_blank" rel="noopener noreferrer">{log.orderNo || log.orderId}</Typography.Link> : log.orderNo || "—" },
          { title: "Order qty before → after", width: 150, render: (_, log) => log.orderQtyBefore != null && log.orderQtyAfter != null ? `${Number(log.orderQtyBefore)} → ${Number(log.orderQtyAfter)}` : "—" },
          { title: "Packs before → after", width: 170, render: (_, log) => `${log.stockQtyBefore} → ${log.stockQtyAfter} (${log.stockQtyAfter - log.stockQtyBefore >= 0 ? "+" : ""}${log.stockQtyAfter - log.stockQtyBefore})` },
          { title: "Stock handling", width: 200, render: (_, log) => log.stockHandling ? <Tag color={log.stockHandling === "UNAVAILABLE" ? "orange" : undefined}>{handlingLabels[log.stockHandling] || log.stockHandling}</Tag> : "—" },
          { title: "User", dataIndex: "actorName", width: 170, render: value => value || "Not recorded" },
        ]}
      />
    </Modal>
  </>;
}
