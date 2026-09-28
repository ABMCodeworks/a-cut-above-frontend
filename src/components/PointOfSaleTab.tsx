import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Form, Input, InputNumber, Result, Row, Select, Space, Spin, Tag, Typography, message } from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { api } from "../api/client";

const { Text, Paragraph } = Typography;
type Product = {
  id: string; name: string; unit: string; retailPrice: number | string;
  stockQty: number; processingStockWeightKg: number | string;
  isForProcessing: boolean; isActive: boolean; isHiddenFromShop: boolean;
  category?: { name: string } | null;
};
type Line = { productId: string; qty: number | null; weightKg: number | null };
type SalePayload = { requestId: string; customerName: string; customerPhone: string; notes: string; total: number; items: { productId: string; qty: number; weightKg?: number }[] };
type Sale = { orderNo: string; customerName: string; total: number | string; items: { id: string; productName: string; qty: number | string; weightKg?: number | string | null; lineTotal: number | string }[] };
const weighed = (p: Product) => p.isForProcessing || /^(kg|kgs|kilogram|kilograms|g|gram|grams)$/.test(p.unit.trim().toLowerCase());
const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

export default function PointOfSaleTab({ onCompleted }: { onCompleted: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<SalePayload | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const submitting = useRef(false);
  const locked = saving || uncertain;

  async function loadProducts() {
    setLoading(true);
    setLoadError(false);
    try { const { data } = await api.get("/api/admin/pos/products"); setProducts(data.products); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadProducts(); }, []);
  function updateLine(id: string, values: Partial<Line>) {
    setLines(current => current.map(line => line.productId === id ? { ...line, ...values } : line));
  }
  async function completeSale() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      let payload = pending;
      if (!uncertain || !payload) {
        const values = await form.validateFields();
        if (!lines.length) { message.error("Add at least one product"); return; }
        for (const line of lines) {
          const product = products.find(p => p.id === line.productId);
          if (!product) { message.error("A selected product is no longer available. Refresh products."); return; }
          if (line.qty === null || !Number.isInteger(line.qty) || line.qty < (product.isForProcessing ? 0 : 1) || line.qty > product.stockQty) {
            message.error(`Check the number of packets for ${product.name}`); return;
          }
          if (weighed(product) && (!line.weightKg || line.weightKg <= 0)) { message.error(`Enter the total weight for ${product.name}`); return; }
        }
        payload = {
          requestId: crypto.randomUUID(), customerName: values.customerName || "", customerPhone: values.customerPhone || "", notes: values.notes || "", total: values.total,
          items: lines.map(line => ({ productId: line.productId, qty: line.qty!, ...(weighed(products.find(p => p.id === line.productId)!) ? { weightKg: line.weightKg! } : {}) })),
        };
        setPending(payload);
      }
      setSaving(true);
      try {
        const { data } = await api.post("/api/admin/pos/sales", payload);
        setCompleted(data.sale);
        setPending(null);
        setUncertain(false);
        onCompleted();
      } catch (error: any) {
        const unknownOutcome = !error.response || error.response.status >= 500;
        setUncertain(unknownOutcome);
        if (!unknownOutcome) { setPending(null); void loadProducts(); }
        message.error(unknownOutcome ? "Could not confirm the sale. Retry below using the same sale reference." : error.response?.data?.error || "Could not complete sale");
      } finally { setSaving(false); }
    } catch (error: any) {
      if (!error?.errorFields) message.error("Check the sale details and try again");
    } finally { submitting.current = false; }
  }

  if (completed) return <Card>
    <Result status="success" title="Sale recorded" subTitle={`${completed.orderNo} · ${completed.customerName} · ${money(completed.total)}`} extra={
      <Button type="primary" onClick={() => { setCompleted(null); setLines([]); form.resetFields(); void loadProducts(); }}>New sale</Button>
    } />
    {completed.items.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #eee" }}>
      <Text>{item.productName} · {Number(item.qty)} packets{item.weightKg != null ? ` · ${Number(item.weightKg)} kg` : ""}</Text><Text strong>{money(item.lineTotal)}</Text>
    </div>)}
    <Paragraph type="secondary" style={{ marginTop: 16 }}>Stock has been deducted. This completed sale is included in Orders and revenue reports.</Paragraph>
  </Card>;

  return <div>
    <Paragraph type="secondary">Record a walk-in sale at the agreed final value. All products are available here, including products hidden from the online shop.</Paragraph>
    {loadError && <Alert type="error" showIcon title="Could not load products" action={<Button onClick={loadProducts}>Retry</Button>} style={{ marginBottom: 16 }} />}
    {uncertain && <Alert type="warning" showIcon title="The sale has not been confirmed" description="Retry the same sale below. Its reference prevents stock being deducted twice if it was already recorded." style={{ marginBottom: 16 }} />}
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={15}>
        <Card title="Products" extra={<Button icon={<ReloadOutlined />} disabled={locked} loading={loading} onClick={loadProducts}>Refresh</Button>}>
          <Select<string> showSearch optionFilterProp="label" value={undefined} placeholder="Search products by name or category" style={{ width: "100%", marginBottom: 20 }} loading={loading} disabled={locked || loadError || loading}
            options={products.filter(p => !lines.some(line => line.productId === p.id)).map(p => ({ value: p.id, label: `${p.name}${p.category ? ` · ${p.category.name}` : ""} · ${p.stockQty} packets${p.isHiddenFromShop ? " · Hidden" : ""}${!p.isActive ? " · Inactive" : ""}${p.isForProcessing ? " · Processing" : ""}` }))}
            onChange={id => setLines(current => [...current, { productId: id, qty: 1, weightKg: null }])}
          />
          {loading && !products.length ? <Spin /> : !lines.length && <Paragraph type="secondary">Select products to start the sale.</Paragraph>}
          <Space orientation="vertical" style={{ width: "100%" }} size={16}>
            {lines.map(line => {
              const product = products.find(p => p.id === line.productId);
              if (!product) return <Alert key={line.productId} type="error" title="Product no longer available" action={<Button disabled={locked} onClick={() => setLines(lines.filter(l => l.productId !== line.productId))}>Remove</Button>} />;
              return <Card size="small" key={product.id} title={product.name} extra={<Button aria-label={`Remove ${product.name}`} icon={<DeleteOutlined />} disabled={locked} onClick={() => setLines(current => current.filter(l => l.productId !== product.id))} />}>
                <Space wrap style={{ marginBottom: 12 }}>
                  <Tag>{product.stockQty} packets in stock</Tag>
                  {product.isHiddenFromShop && <Tag color="gold">Hidden from shop</Tag>}
                  {!product.isActive && <Tag>Inactive</Tag>}
                  {product.isForProcessing && <Tag color="blue">{Number(product.processingStockWeightKg)} kg processing stock</Tag>}
                </Space>
                <Row gutter={16}>
                  <Col xs={24} sm={weighed(product) ? 12 : 24}>
                    <label style={{ display: "block", marginBottom: 6 }}>Packets sold</label>
                    <InputNumber aria-label={`Packets sold: ${product.name}`} min={product.isForProcessing ? 0 : 1} max={product.stockQty} precision={0} value={line.qty} onChange={qty => updateLine(product.id, { qty })} disabled={locked} style={{ width: "100%" }} />
                  </Col>
                  {weighed(product) && <Col xs={24} sm={12}>
                    <label style={{ display: "block", marginBottom: 6 }}>Total weight sold (kg)</label>
                    <InputNumber aria-label={`Weight sold: ${product.name}`} min={0.001} precision={3} step={0.1} value={line.weightKg} onChange={weightKg => updateLine(product.id, { weightKg })} disabled={locked} style={{ width: "100%" }} />
                  </Col>}
                </Row>
                {product.isForProcessing && <Text type="secondary">For part of a processing packet, enter 0 packets and the weight used.</Text>}
              </Card>;
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card title="Complete sale">
          <Form form={form} layout="vertical" disabled={locked}>
            <Form.Item name="total" label="Final sale value ($)" rules={[{ required: true, message: "Enter the final sale value" }, { type: "number", min: 0.01, max: 99999999.99 }]} extra="Enter the agreed total for all selected products.">
              <InputNumber min={0.01} precision={2} prefix="$" style={{ width: "100%" }} size="large" />
            </Form.Item>
            <Form.Item name="customerName" label="Customer name (optional)"><Input maxLength={200} placeholder="Walk-in customer" /></Form.Item>
            <Form.Item name="customerPhone" label="Phone (optional)"><Input maxLength={60} /></Form.Item>
            <Form.Item name="notes" label="Notes (optional)"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
          </Form>
          <Paragraph type="secondary">Completing this sale records revenue and deducts stock immediately. No WhatsApp messages are sent and no delivery is scheduled.</Paragraph>
          <Button type="primary" size="large" block loading={saving} disabled={!uncertain && (loading || loadError || !lines.length)} onClick={completeSale}>{uncertain ? "Retry same sale" : "Complete sale"}</Button>
        </Card>
      </Col>
    </Row>
  </div>;
}
