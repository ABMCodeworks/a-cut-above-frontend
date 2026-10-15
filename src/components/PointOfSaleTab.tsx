import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Collapse, Empty, Form, Input, InputNumber, Result, Row, Select, Space, Spin, Tag, Typography, message } from "antd";
import { DeleteOutlined, ReloadOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import "./PointOfSaleTab.css";
import { api } from "../api/client";

const { Text, Paragraph } = Typography;
type Product = {
  id: string; name: string; unit: string; retailPrice: number | string;
  stockQty: number; avgWeightG?: number | null; posPartialWeightKg: number | string; processingStockWeightKg: number | string;
  isForProcessing: boolean; isActive: boolean; isHiddenFromShop: boolean;
  category?: { name: string } | null;
};
type Line = { productId: string; qty: number | null; weightKg: number | null; discountPercent: number };
type SalePayload = { requestId: string; customerName: string; customerPhone: string; notes: string; orderDiscountPercent: number; items: { productId: string; qty?: number; weightKg?: number; unitPrice: number; discountPercent: number }[] };
type Sale = { orderNo: string; customerName: string; total: number | string; items: { id: string; productName: string; qty: number | string; weightKg?: number | string | null; lineTotal: number | string }[] };
const weighed = (p: Product) => p.isForProcessing || /^(kg|kgs|kilogram|kilograms|g|gram|grams)$/.test(p.unit.trim().toLowerCase());
const defaultPrice = (p: Product) => Math.round(Number(p.retailPrice) * (/^(g|gram|grams)$/.test(p.unit.trim().toLowerCase()) ? 1000 : 1) * 100) / 100;
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const gross = (line: Line, p: Product) => round(defaultPrice(p) * (weighed(p) ? line.weightKg || 0 : line.qty || 0));
const lineValue = (line: Line, p: Product, orderPercent = 0) => {
  const subtotal = gross(line, p);
  const afterProduct = round(subtotal - round(subtotal * line.discountPercent / 100));
  return round(afterProduct - round(afterProduct * orderPercent / 100));
};
const availableKg = (p: Product) => p.isForProcessing ? Number(p.processingStockWeightKg) : Number(Math.max(0, p.stockQty * Number(p.avgWeightG || 0) / 1000 - Number(p.posPartialWeightKg || 0)).toFixed(6));
const stockLabel = (p: Product) => weighed(p) ? `${availableKg(p).toFixed(3)} kg${!p.isForProcessing ? " (from average pack weight)" : ""}` : `${p.stockQty} packs`;
const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

export default function PointOfSaleTab({ onCompleted }: { onCompleted: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<SalePayload | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const submitting = useRef(false);
  const locked = saving || uncertain;

  const subtotal = round(lines.reduce((sum, line) => { const p = products.find(p => p.id === line.productId); return sum + (p ? gross(line, p) : 0); }, 0));
  const total = lines.reduce((sum, line) => {
    const product = products.find(p => p.id === line.productId);
    return sum + (product ? Math.round(lineValue(line, product, orderDiscountPercent) * 100) : 0);
  }, 0) / 100;
  const issue = (line: Line, product: Product) => {
    if (!Number.isFinite(line.discountPercent) || line.discountPercent < 0 || line.discountPercent > 100) return "Enter a discount between 0 and 100%.";
    if (weighed(product)) {
      if (!product.isForProcessing && !product.avgWeightG) return "Set an average pack weight in Products to sell by kg.";
      if (!line.weightKg || line.weightKg <= 0 || line.weightKg > availableKg(product)) return "Check kg against available stock.";
    } else if (line.qty === null || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > product.stockQty) return "Check packs against available stock.";
    return null;
  };
  const ready = lines.length > 0 && subtotal > 0 && subtotal <= 99999999.99 && orderDiscountPercent >= 0 && orderDiscountPercent <= 100 && total >= 0 && total <= 99999999.99 && lines.every(line => {
    const product = products.find(p => p.id === line.productId);
    return product && !issue(line, product);
  });

  async function loadProducts() {
    setLoading(true);
    setLoadError(false);
    try { const { data } = await api.get("/api/admin/pos/products"); setProducts(data.products); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadProducts(); }, []);
  function updateLine(id: string, values: Partial<Line>) {
    setLines(current => current.map(line => {
      if (line.productId !== id) return line;
      return { ...line, ...values };
    }));
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
          const problem = issue(line, product);
          if (problem) { message.error(`${product.name}: ${problem}`); return; }
        }
        if (!ready) { message.error("Check product quantities, weights and prices before completing the sale"); return; }
        payload = {
          requestId: crypto.randomUUID(), customerName: values.customerName || "", customerPhone: values.customerPhone || "", notes: values.notes || "",
          orderDiscountPercent,
          items: lines.map(line => {
            const product = products.find(p => p.id === line.productId)!;
            return { productId: line.productId, discountPercent: line.discountPercent, unitPrice: defaultPrice(product), ...(weighed(product) ? { weightKg: line.weightKg! } : { qty: line.qty! }) };
          }),
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
      <Button type="primary" onClick={() => { setCompleted(null); setLines([]); setOrderDiscountPercent(0); form.resetFields(); void loadProducts(); }}>New sale</Button>
    } />
    {completed.items.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #eee" }}>
      <Text>{item.productName} · {item.weightKg != null ? `${Number(item.weightKg)} kg` : `${Number(item.qty)} packs`}</Text><Text strong>{money(item.lineTotal)}</Text>
    </div>)}
    <Paragraph type="secondary" style={{ marginTop: 16 }}>Stock has been deducted. This completed sale is included in Orders and revenue reports.</Paragraph>
  </Card>;

  return <div className="pos-workspace">
    <div className="pos-heading"><div><Typography.Title level={3} style={{ margin: 0 }}>New sale</Typography.Title><Paragraph type="secondary">Enter kg or packs sold. Prices and totals are calculated automatically, with optional product and order discounts.</Paragraph></div><Tag icon={<ShoppingCartOutlined />}>Walk-in sale</Tag></div>
    {loadError && <Alert type="error" showIcon title="Could not load products" action={<Button onClick={loadProducts}>Retry</Button>} style={{ marginBottom: 16 }} />}
    {uncertain && <Alert type="warning" showIcon title="The sale has not been confirmed" description="Retry the same sale below. Its reference prevents stock being deducted twice if it was already recorded." style={{ marginBottom: 16 }} />}
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={15}>
        <Card className="pos-products" title={`Products · ${lines.length}`} extra={<Button icon={<ReloadOutlined />} disabled={locked} loading={loading} onClick={loadProducts}>Refresh</Button>}>
          <Select<string | null> showSearch optionFilterProp="label" value={null} aria-label="Add a product" size="large" placeholder="Search and add a product…" style={{ width: "100%", marginBottom: 20 }} loading={loading} disabled={locked || loadError || loading}
            options={products.filter(p => !lines.some(line => line.productId === p.id)).map(p => ({ value: p.id, label: `${p.name}${p.category ? ` · ${p.category.name}` : ""} · ${stockLabel(p)}${p.isHiddenFromShop ? " · Hidden" : ""}${!p.isActive ? " · Inactive" : ""}${p.isForProcessing ? " · Processing" : ""}` }))}
            onChange={id => { if (!id) return; setLines(current => [...current, { productId: id, qty: 1, weightKg: null, discountPercent: 0 }]); }}
          />
          {loading && !products.length ? <Spin /> : !lines.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>Your sale is empty</strong><div>Search above to add your first product.</div></>} />}
          <Space orientation="vertical" style={{ width: "100%" }} size={16}>
            {lines.map(line => {
              const product = products.find(p => p.id === line.productId);
              if (!product) return <Alert key={line.productId} type="error" title="Product no longer available" action={<Button disabled={locked} onClick={() => setLines(lines.filter(l => l.productId !== line.productId))}>Remove</Button>} />;
              return <Card className="pos-line" size="small" key={product.id}>
                <div className="pos-line-row">
                  <div className="pos-line-product">
                    <label>Product</label>
                    <Text strong className="pos-line-name">{product.name}</Text>
                    <Space wrap size={[4, 4]} className="pos-line-tags">
                      <Tag>{stockLabel(product)} in stock</Tag>
                      {product.isHiddenFromShop && <Tag color="gold">Hidden from shop</Tag>}
                      {!product.isActive && <Tag>Inactive</Tag>}
                      {product.isForProcessing && <Tag color="blue">Processing</Tag>}
                    </Space>
                  </div>
                  <div className="pos-line-quantity">
                    <label>{weighed(product) ? "Kg sold" : "Number of packs"}</label>
                    <InputNumber aria-label={`Quantity sold: ${product.name}`} min={weighed(product) ? 0.001 : 1} max={weighed(product) ? availableKg(product) : product.stockQty} precision={weighed(product) ? 3 : 0} step={weighed(product) ? 0.1 : 1} value={weighed(product) ? line.weightKg : line.qty} onChange={value => updateLine(product.id, weighed(product) ? { weightKg: value } : { qty: value })} disabled={locked} style={{ width: "100%" }} />
                  </div>
                  <div className="pos-line-discount">
                    <label>Product discount (%)</label>
                    <InputNumber aria-label={`Discount: ${product.name}`} min={0} max={100} precision={2} value={line.discountPercent} onChange={value => updateLine(product.id, { discountPercent: value || 0 })} disabled={locked} style={{ width: "100%" }} />
                  </div>
                  <div className="pos-line-total">
                    <label>Product total</label>
                    <Text strong>{money(lineValue(line, product))}</Text>
                    <Text type="secondary">{money(defaultPrice(product))} / {weighed(product) ? "kg" : "pack"}</Text>
                  </div>
                  <Button className="pos-line-remove" aria-label={`Remove ${product.name}`} icon={<DeleteOutlined />} disabled={locked} onClick={() => setLines(current => current.filter(l => l.productId !== product.id))} />
                </div>
                {issue(line, product) && <div className="pos-line-hint">{issue(line, product)}</div>}

              </Card>;
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card className="pos-summary" title="Sale summary">
          {lines.length ? lines.map(line => {
            const product = products.find(p => p.id === line.productId);
            return product && <div className="pos-summary-line" key={line.productId}><Text>{product.name}</Text><Text strong>{money(lineValue(line, product, orderDiscountPercent))}</Text></div>;
          }) : <Text type="secondary">Your products will appear here.</Text>}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Whole order discount (%)</label>
            <InputNumber aria-label="Whole order discount" min={0} max={100} precision={2} value={orderDiscountPercent} onChange={value => setOrderDiscountPercent(value || 0)} disabled={locked} style={{ width: "100%" }} />
            <Text type="secondary">Applied after product discounts.</Text>
          </div>
          <div className="pos-summary-line"><Text>Total discount</Text><Text>{money(round(subtotal - total))}</Text></div>
          <div className="pos-grand-total"><Text>Total to collect</Text><strong>{money(total)}</strong><Text type="secondary">{lines.length} product{lines.length === 1 ? "" : "s"} · Calculated from product prices</Text></div>
          <Collapse ghost items={[{ key: "customer", forceRender: true, label: "Customer details & notes (optional)", children:
            <Form form={form} layout="vertical" disabled={locked}>
              <Form.Item name="customerName" label="Customer name"><Input maxLength={200} placeholder="Walk-in customer" /></Form.Item>
              <Form.Item name="customerPhone" label="Phone"><Input maxLength={60} inputMode="tel" placeholder="Customer phone number" /></Form.Item>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} maxLength={2000} placeholder="Add a note about this sale" /></Form.Item>
            </Form>
          }]} />
          <Paragraph type="secondary">Completing this sale records revenue and deducts stock immediately. No WhatsApp messages are sent and no delivery is scheduled.</Paragraph>
          <Button type="primary" size="large" block loading={saving} disabled={!uncertain && (loading || loadError || !ready)} onClick={completeSale}>{uncertain ? "Retry same sale" : `Complete sale · ${money(total)}`}</Button>
        </Card>
      </Col>
    </Row>
  </div>;
}
