import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Col, Collapse, Empty, Form, Input, InputNumber, Result, Row, Select, Space, Spin, Tag, Typography, message } from "antd";
import { DeleteOutlined, ReloadOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import "./PointOfSaleTab.css";
import { api } from "../api/client";

const { Text, Paragraph } = Typography;
type Product = {
  id: string; name: string; unit: string; retailPrice: number | string;
  stockQty: number; processingStockWeightKg: number | string;
  isForProcessing: boolean; isActive: boolean; isHiddenFromShop: boolean;
  category?: { name: string } | null;
};
type Line = { productId: string; qty: number | null; weightKg: number | null; unitPrice: number | null; pricingMode: "TOTAL" | "INDIVIDUAL" | "WEIGHT"; packetPrices: (number | null)[]; productTotal: number | null };
type SalePayload = { requestId: string; customerName: string; customerPhone: string; notes: string; items: { productId: string; qty: number; weightKg?: number; packetPrices?: number[]; unitPrice?: number; lineTotal?: number; priceBasis?: "PACKET" | "WEIGHT" }[] };
type Sale = { orderNo: string; customerName: string; total: number | string; items: { id: string; productName: string; qty: number | string; weightKg?: number | string | null; lineTotal: number | string }[] };
const weighed = (p: Product) => p.isForProcessing || /^(kg|kgs|kilogram|kilograms|g|gram|grams)$/.test(p.unit.trim().toLowerCase());
const defaultPrice = (p: Product) => Math.round(Number(p.retailPrice) * (/^(g|gram|grams)$/.test(p.unit.trim().toLowerCase()) ? 1000 : 1) * 100) / 100;
const lineValue = (line: Line, _product: Product) => line.pricingMode === "TOTAL" ? line.productTotal || 0 : line.pricingMode === "INDIVIDUAL" ? line.packetPrices.reduce<number>((sum, price) => sum + Math.round((price || 0) * 100), 0) / 100 : Math.round(((line.unitPrice || 0) * (line.pricingMode === "WEIGHT" ? line.weightKg || 0 : line.qty || 0) + Number.EPSILON) * 100) / 100;
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

  const total = lines.reduce((sum, line) => {
    const product = products.find(p => p.id === line.productId);
    return sum + (product ? Math.round(lineValue(line, product) * 100) : 0);
  }, 0) / 100;
  const issue = (line: Line, product: Product) => {
    if (line.qty === null || !Number.isInteger(line.qty) || line.qty < (product.isForProcessing ? 0 : 1) || line.qty > product.stockQty) return "Check packets against available stock.";
    if (weighed(product) && (!line.weightKg || line.weightKg <= 0)) return "Enter the total weight sold.";
    if (product.isForProcessing && (line.weightKg || 0) > Number(product.processingStockWeightKg)) return "Weight exceeds available stock.";
    if (line.pricingMode === "INDIVIDUAL") {
      if (!line.qty || line.qty > 1000) return "Individual pricing supports 1–1,000 packets. Otherwise use a product total.";
      if (line.packetPrices.length !== line.qty || line.packetPrices.some(price => price === null || price < 0 || price > 99999999.99)) return "Enter a price for every packet.";
      return null;
    }
    const price = line.pricingMode === "TOTAL" ? line.productTotal : line.unitPrice;
    if (price === null || price < 0 || price > 99999999.99) return "Enter a valid product price.";
    return null;
  };
  const ready = lines.length > 0 && total > 0 && total <= 99999999.99 && lines.every(line => {
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
      const next = { ...line, ...values };
      if (values.qty !== undefined) next.packetPrices = Array.from({ length: Math.min(1000, Math.max(0, next.qty || 0)) }, (_, i) => line.packetPrices[i] ?? null);
      return next;
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
          if (line.qty === null || !Number.isInteger(line.qty) || line.qty < (product.isForProcessing ? 0 : 1) || line.qty > product.stockQty) {
            message.error(`Check the number of packets for ${product.name}`); return;
          }
          if (weighed(product) && (!line.weightKg || line.weightKg <= 0)) { message.error(`Enter the total weight for ${product.name}`); return; }
        }
        if (!ready) { message.error("Check product quantities, weights and prices before completing the sale"); return; }
        payload = {
          requestId: crypto.randomUUID(), customerName: values.customerName || "", customerPhone: values.customerPhone || "", notes: values.notes || "",
          items: lines.map(line => ({ productId: line.productId, qty: line.qty!, ...(line.pricingMode === "TOTAL" ? { lineTotal: line.productTotal! } : line.pricingMode === "INDIVIDUAL" ? { packetPrices: line.packetPrices as number[] } : { unitPrice: line.unitPrice!, priceBasis: "WEIGHT" as const }), ...(weighed(products.find(p => p.id === line.productId)!) ? { weightKg: line.weightKg! } : {}) })),
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

  return <div className="pos-workspace">
    <div className="pos-heading"><div><Typography.Title level={3} style={{ margin: 0 }}>New sale</Typography.Title><Paragraph type="secondary">Enter packets sold and a product total, or enter a different price for each packet. Your total updates automatically.</Paragraph></div><Tag icon={<ShoppingCartOutlined />}>Walk-in sale</Tag></div>
    {loadError && <Alert type="error" showIcon title="Could not load products" action={<Button onClick={loadProducts}>Retry</Button>} style={{ marginBottom: 16 }} />}
    {uncertain && <Alert type="warning" showIcon title="The sale has not been confirmed" description="Retry the same sale below. Its reference prevents stock being deducted twice if it was already recorded." style={{ marginBottom: 16 }} />}
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={15}>
        <Card className="pos-products" title={`Products · ${lines.length}`} extra={<Button icon={<ReloadOutlined />} disabled={locked} loading={loading} onClick={loadProducts}>Refresh</Button>}>
          <Select<string | null> showSearch optionFilterProp="label" value={null} aria-label="Add a product" size="large" placeholder="Search and add a product…" style={{ width: "100%", marginBottom: 20 }} loading={loading} disabled={locked || loadError || loading}
            options={products.filter(p => !lines.some(line => line.productId === p.id)).map(p => ({ value: p.id, label: `${p.name}${p.category ? ` · ${p.category.name}` : ""} · ${p.stockQty} packets${p.isHiddenFromShop ? " · Hidden" : ""}${!p.isActive ? " · Inactive" : ""}${p.isForProcessing ? " · Processing" : ""}` }))}
            onChange={id => { if (!id) return; const product = products.find(p => p.id === id)!; setLines(current => [...current, { productId: id, qty: product.isForProcessing && product.stockQty === 0 ? 0 : 1, weightKg: null, unitPrice: defaultPrice(product), pricingMode: "TOTAL", packetPrices: product.isForProcessing && product.stockQty === 0 ? [] : [null], productTotal: null }]); }}
          />
          {loading && !products.length ? <Spin /> : !lines.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>Your sale is empty</strong><div>Search above to add your first product.</div></>} />}
          <Space orientation="vertical" style={{ width: "100%" }} size={16}>
            {lines.map(line => {
              const product = products.find(p => p.id === line.productId);
              if (!product) return <Alert key={line.productId} type="error" title="Product no longer available" action={<Button disabled={locked} onClick={() => setLines(lines.filter(l => l.productId !== line.productId))}>Remove</Button>} />;
              return <Card className="pos-line" size="small" key={product.id} title={product.name} extra={<Button aria-label={`Remove ${product.name}`} icon={<DeleteOutlined />} disabled={locked} onClick={() => setLines(current => current.filter(l => l.productId !== product.id))} />}>
                <Space wrap style={{ marginBottom: 12 }}>
                  <Tag>{product.stockQty} packets in stock</Tag>
                  {product.isHiddenFromShop && <Tag color="gold">Hidden from shop</Tag>}
                  {!product.isActive && <Tag>Inactive</Tag>}
                  {product.isForProcessing && <Tag color="blue">{Number(product.processingStockWeightKg)} kg processing stock</Tag>}
                </Space>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>How would you like to enter the price?</label>
                  <Select aria-label={`Pricing method: ${product.name}`} value={line.pricingMode} disabled={locked} style={{ width: "100%" }}
                    options={[{ value: "TOTAL", label: "Total price for this product" }, { value: "INDIVIDUAL", label: "Enter each packet’s price" }, ...(weighed(product) ? [{ value: "WEIGHT", label: "Price per kg" }] : [])]}
                    onChange={pricingMode => updateLine(product.id, { pricingMode, ...(pricingMode !== "TOTAL" && pricingMode !== line.pricingMode ? { unitPrice: defaultPrice(product) } : {}) })} />
                </div>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={weighed(product) ? 8 : 12}>
                    <label style={{ display: "block", marginBottom: 6 }}>Packets sold</label>
                    <InputNumber aria-label={`Packets sold: ${product.name}`} min={product.isForProcessing ? 0 : 1} max={product.stockQty} precision={0} value={line.qty} onChange={qty => updateLine(product.id, { qty })} disabled={locked} style={{ width: "100%" }} />
                  </Col>
                  {weighed(product) && <Col xs={24} sm={8}>
                    <label style={{ display: "block", marginBottom: 6 }}>Total weight sold (kg)</label>
                    <InputNumber aria-label={`Weight sold: ${product.name}`} min={0.001} precision={3} step={0.1} value={line.weightKg} onChange={weightKg => updateLine(product.id, { weightKg })} disabled={locked} style={{ width: "100%" }} />
                  </Col>}
                  {line.pricingMode !== "INDIVIDUAL" && <Col xs={24} sm={weighed(product) ? 8 : 12}>
                    <label style={{ display: "block", marginBottom: 6 }}>{line.pricingMode === "TOTAL" ? "Total price for these packets" : "Price per kg"}</label>
                    <InputNumber aria-label={`Price: ${product.name}`} min={0} max={99999999.99} precision={2} prefix="$" value={line.pricingMode === "TOTAL" ? line.productTotal : line.unitPrice} onChange={price => updateLine(product.id, line.pricingMode === "TOTAL" ? { productTotal: price } : { unitPrice: price })} disabled={locked} style={{ width: "100%" }} />
                  </Col>}
                </Row>
                {line.pricingMode === "INDIVIDUAL" && <div style={{ marginTop: 16 }}>
                  <Text type="secondary">Enter the actual selling price of each packet.</Text>
                  <Row gutter={[12, 12]} style={{ marginTop: 8, maxHeight: 320, overflowY: "auto" }}>
                    {line.packetPrices.map((price, index) => <Col xs={12} sm={8} key={index}>
                      <label style={{ display: "block", marginBottom: 6 }}>Packet {index + 1}</label>
                      <InputNumber aria-label={`Packet ${index + 1} price: ${product.name}`} min={0} max={99999999.99} precision={2} prefix="$" placeholder="Price" value={price} disabled={locked} style={{ width: "100%" }}
                        onChange={value => updateLine(product.id, { packetPrices: line.packetPrices.map((existing, i) => i === index ? value : existing) })} />
                    </Col>)}
                  </Row>
                </div>}
                <div className="pos-line-total"><Text type="secondary">{line.pricingMode === "TOTAL" ? `${line.qty || 0} packets · Product total` : line.pricingMode === "INDIVIDUAL" ? `${line.qty || 0} individual packet prices` : `${line.pricingMode === "WEIGHT" ? `${line.weightKg || 0} kg` : `${line.qty || 0} packets`} × ${money(line.unitPrice || 0)}`}</Text><Text strong>{money(lineValue(line, product))}</Text></div>
                {issue(line, product) && <div className="pos-line-hint">{issue(line, product)}</div>}
                {product.isForProcessing && <Text type="secondary">For part of a processing packet, enter 0 packets and the weight used.</Text>}
              </Card>;
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card className="pos-summary" title="Sale summary">
          {lines.length ? lines.map(line => {
            const product = products.find(p => p.id === line.productId);
            return product && <div className="pos-summary-line" key={line.productId}><Text>{product.name}</Text><Text strong>{money(lineValue(line, product))}</Text></div>;
          }) : <Text type="secondary">Your products will appear here.</Text>}
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
