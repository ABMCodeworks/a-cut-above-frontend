// src/components/DashboardTab.tsx
import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import type {
  AdminOrder,
  AdminProduct,
  AdminWindow,
  AdminOrderItem,
  CarcassWeightRecord,
} from "../pages/admin/AdminDashboardPage";

const { RangePicker } = DatePicker;
const { Text } = Typography;

function n(v: any): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v: number) {
  return `$${v.toFixed(2)}`;
}

function statusColor(s: string) {
  const k = String(s || "").toUpperCase();
  if (k === "DELIVERED") return "green";
  if (k === "SHIPPING") return "blue";
  if (k === "PACKED") return "gold";
  return "default";
}

function isKgItem(it: AdminOrderItem) {
  return String((it as any).unit || "").toLowerCase() === "kg";
}

function weightsComplete(order: AdminOrder) {
  const kgItems = (order.items || []).filter(isKgItem);
  if (kgItems.length === 0) return true;

  return kgItems.every((it) => {
    const w = (it as any).weightKg;
    return w !== null && w !== undefined && w !== "";
  });
}

function moneyReady(order: AdminOrder) {
  return weightsComplete(order);
}

type TopProductRow = {
  key: string;
  productName: string;
  qty: number;
  revenue: number;
  profit: number;
};

type TopCustomerRow = {
  key: string;
  customerName: string;
  customerPhone: string;
  orders: number;
  spend: number;
  profit: number;
};

type StockValueRow = {
  key: string;
  categoryName: string;
  stockQty: number;
  costValue: number;
  retailValue: number;
};

export default function DashboardTab({
  loading,
  orders,
  products,
  windows,
  carcassWeights,
  totalWasteValue = 0,
}: {
  loading: boolean;
  orders: AdminOrder[];
  products: AdminProduct[];
  windows: AdminWindow[];
  carcassWeights: CarcassWeightRecord[];
  totalWasteValue?: number;
}) {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().subtract(30, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);

  const [windowId, setWindowId] = useState<string | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<
    "7" | "30" | "this_month" | "all" | null
  >("30");

  const windowOptions = useMemo(
    () => [
      { label: "All windows", value: "" },
      ...windows.map((w) => ({ label: w.name, value: w.id })),
    ],
    [windows],
  );

  const productCostMaps = useMemo(() => {
    const byId = new Map<string, number>();
    const byName = new Map<string, number>();

    for (const p of products || []) {
      const cost = n((p as any).costPrice);

      if ((p as any).id) byId.set(String((p as any).id), cost);

      if ((p as any).name) {
        byName.set(
          String((p as any).name)
            .trim()
            .toLowerCase(),
          cost,
        );
      }
    }

    return { byId, byName };
  }, [products]);

  function getItemCostPrice(it: any): number {
    const productId = String(it?.productId || "").trim();
    const productName = String(it?.productName || "")
      .trim()
      .toLowerCase();

    if (productId && productCostMaps.byId.has(productId)) {
      return n(productCostMaps.byId.get(productId));
    }

    if (productName && productCostMaps.byName.has(productName)) {
      return n(productCostMaps.byName.get(productName));
    }

    return 0;
  }

  function getItemProfit(it: any): number {
    const revenue = n(it?.lineTotal);
    const unit = String(it?.unit || "").toLowerCase();
    const costPrice = getItemCostPrice(it);

    let costTotal = 0;

    if (unit === "kg") {
      const weightKg = n(it?.weightKg);
      costTotal = costPrice * weightKg;
    } else {
      const qty = n(it?.qty);
      costTotal = costPrice * qty;
    }

    return revenue - costTotal;
  }

  const filteredOrders = useMemo(() => {
    let list = [...(orders || [])];

    if (windowId) {
      list = list.filter(
        (o) => String((o as any).windowId || "") === String(windowId),
      );
    }

    if (range && (range[0] || range[1])) {
      const start = range[0]?.startOf("day") ?? null;
      const end = range[1]?.endOf("day") ?? null;

      list = list.filter((o) => {
        const t = dayjs(o.createdAt);
        if (start && t.isBefore(start)) return false;
        if (end && t.isAfter(end)) return false;
        return true;
      });
    }

    return list;
  }, [orders, range, windowId]);

  const moneyReadyOrders = useMemo(
    () => filteredOrders.filter((o) => moneyReady(o)),
    [filteredOrders],
  );

  const carcassStats = useMemo(() => {
    const complete = (carcassWeights || []).filter(
      (r) =>
        r.dryWeightKg !== null &&
        r.dryWeightKg !== undefined &&
        n(r.wetWeightKg) > 0,
    );

    const avgLossPct = complete.length
      ? complete.reduce((sum, r) => {
        const wet = n(r.wetWeightKg);
        const dry = n(r.dryWeightKg);
        return sum + ((wet - dry) / wet) * 100;
      }, 0) / complete.length
      : 0;

    return {
      completeCount: complete.length,
      avgLossPct,
    };
  }, [carcassWeights]);

  const stockValuation = useMemo(() => {
    const rows = new Map<string, StockValueRow & { sortOrder: number }>();

    for (const product of products || []) {
      const stockQty = Math.max(0, n(product.stockQty));
      if (stockQty <= 0) continue;

      const categoryName = product.category?.name || "Unassigned";
      const categoryKey = product.category?.id || "unassigned";
      const unit = String(product.unit || "").toLowerCase();
      const avgWeightKg = n(product.avgWeightG) > 0 ? n(product.avgWeightG) / 1000 : 1;
      const stockUnits =
        product.isForProcessing && unit === "kg" && n(product.processingStockWeightKg) > 0
          ? n(product.processingStockWeightKg)
          : stockQty * (unit === "kg" ? avgWeightKg : 1);
      const row = rows.get(categoryKey) || {
        key: categoryKey,
        categoryName,
        stockQty: 0,
        costValue: 0,
        retailValue: 0,
        sortOrder: n(product.category?.sortOrder),
      };

      row.stockQty += stockQty;
      row.costValue += stockUnits * n(product.costPrice);
      row.retailValue += stockUnits * n(product.retailPrice);
      rows.set(categoryKey, row);
    }

    const categoryRows = [...rows.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.categoryName.localeCompare(b.categoryName),
    );
    const totals = categoryRows.reduce(
      (total, row) => ({
        stockQty: total.stockQty + row.stockQty,
        costValue: total.costValue + row.costValue,
        retailValue: total.retailValue + row.retailValue,
      }),
      { stockQty: 0, costValue: 0, retailValue: 0 },
    );

    return { rows: categoryRows, totals };
  }, [products]);

  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const moneyOrders = moneyReadyOrders.length;

    const revenue = moneyReadyOrders.reduce((acc, o) => acc + n(o.total), 0);
    const discounts = moneyReadyOrders.reduce(
      (acc, o) => acc + n(o.discountTotal),
      0,
    );
    const grossRevenue = revenue + discounts;
    const avgOrder = moneyOrders ? revenue / moneyOrders : 0;

    const profit = moneyReadyOrders.reduce((acc, o) => {
      const orderProfit = (o.items || []).reduce(
        (sum, it) => sum + getItemProfit(it),
        0,
      );
      return acc + orderProfit;
    }, 0);

    const itemsSold = filteredOrders.reduce((acc, o) => {
      const sum = (o.items || []).reduce((a, it) => a + n((it as any).qty), 0);
      return acc + sum;
    }, 0);

    const statusCounts: Record<string, number> = {};

    for (const o of filteredOrders) {
      const s = String(o.status || "PROCESSING").toUpperCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const delivered = statusCounts["DELIVERED"] || 0;
    const deliveredPct = totalOrders ? (delivered / totalOrders) * 100 : 0;

    const activeProducts = (products || []).filter(
      (p) => !!(p as any).isActive,
    ).length;

    const totalProducts = (products || []).length;
    const pendingWeights = totalOrders - moneyOrders;

    return {
      totalOrders,
      revenue,
      discounts,
      grossRevenue,
      avgOrder,
      profit,
      itemsSold,
      statusCounts,
      deliveredPct,
      activeProducts,
      totalProducts,
      moneyOrders,
      pendingWeights,
    };
  }, [filteredOrders, moneyReadyOrders, products, productCostMaps]);

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; qty: number; revenue: number; profit: number }
    >();

    for (const o of filteredOrders) {
      const canCountMoney = moneyReady(o);

      for (const it of (o.items || []) as any[]) {
        const name = String(it.productName || "").trim() || "Unknown";
        const qty = n(it.qty);

        const cur = map.get(name) || {
          productName: name,
          qty: 0,
          revenue: 0,
          profit: 0,
        };

        cur.qty += qty;

        if (canCountMoney) {
          cur.revenue += n(it.lineTotal);
          cur.profit += getItemProfit(it);
        }

        map.set(name, cur);
      }
    }

    return Array.from(map.values())
      .map((x) => ({
        key: x.productName,
        productName: x.productName,
        qty: x.qty,
        revenue: x.revenue,
        profit: x.profit,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, productCostMaps]);

  const topProductsByQty = useMemo(
    () => [...topProducts].sort((a, b) => b.qty - a.qty).slice(0, 10),
    [topProducts],
  );

  const topProductsByRevenue = useMemo(
    () => [...topProducts].slice(0, 10),
    [topProducts],
  );

  const topCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        customerName: string;
        customerPhone: string;
        orders: number;
        spend: number;
        profit: number;
      }
    >();

    for (const o of filteredOrders) {
      const phone = String(o.customerPhone || "").trim() || "No phone";
      const name = String(o.customerName || "Unknown").trim() || "Unknown";

      const cur = map.get(phone) || {
        customerName: name,
        customerPhone: phone,
        orders: 0,
        spend: 0,
        profit: 0,
      };

      cur.orders += 1;

      if (!cur.customerName || cur.customerName === "Unknown") {
        cur.customerName = name;
      }

      if (moneyReady(o)) {
        cur.spend += n(o.total);
        cur.profit += (o.items || []).reduce(
          (sum, it) => sum + getItemProfit(it),
          0,
        );
      }

      map.set(phone, cur);
    }

    return Array.from(map.values())
      .map((x) => ({
        key: x.customerPhone,
        customerName: x.customerName,
        customerPhone: x.customerPhone,
        orders: x.orders,
        spend: x.spend,
        profit: x.profit,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);
  }, [filteredOrders, productCostMaps]);

  const topProductCols: ColumnsType<TopProductRow> = [
    { title: "Product", dataIndex: "productName", key: "productName" },
    {
      title: "Qty sold",
      dataIndex: "qty",
      key: "qty",
      width: 120,
      render: (v) => Number(v || 0).toFixed(0),
    },
    {
      title: "Revenue (finalized)",
      dataIndex: "revenue",
      key: "revenue",
      width: 170,
      render: (v) => money(n(v)),
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 140,
      render: (v) => money(n(v)),
    },
  ];

  const topCustomerCols: ColumnsType<TopCustomerRow> = [
    { title: "Customer", dataIndex: "customerName", key: "customerName" },
    {
      title: "Phone",
      dataIndex: "customerPhone",
      key: "customerPhone",
      width: 140,
    },
    { title: "Orders", dataIndex: "orders", key: "orders", width: 100 },
    {
      title: "Spend (finalized)",
      dataIndex: "spend",
      key: "spend",
      width: 170,
      render: (v) => money(n(v)),
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 140,
      render: (v) => money(n(v)),
    },
  ];

  const stockValueCols: ColumnsType<StockValueRow> = [
    { title: "Animal / category", dataIndex: "categoryName", key: "categoryName" },
    {
      title: "Items in stock",
      dataIndex: "stockQty",
      key: "stockQty",
      width: 150,
      align: "right",
      render: (value) => n(value).toFixed(0),
    },
    {
      title: "Total cost value",
      dataIndex: "costValue",
      key: "costValue",
      width: 180,
      align: "right",
      render: (value) => money(n(value)),
    },
    {
      title: "Total retail value",
      dataIndex: "retailValue",
      key: "retailValue",
      width: 180,
      align: "right",
      render: (value) => money(n(value)),
    },
  ];

  function setPreset(preset: "7" | "30" | "this_month" | "all") {
    setActivePreset(preset);

    if (preset === "all") {
      setRange([null, null]);
      return;
    }

    if (preset === "7") {
      setRange([
        dayjs().subtract(7, "day").startOf("day"),
        dayjs().endOf("day"),
      ]);
    }

    if (preset === "30") {
      setRange([
        dayjs().subtract(30, "day").startOf("day"),
        dayjs().endOf("day"),
      ]);
    }

    if (preset === "this_month") {
      setRange([dayjs().startOf("month"), dayjs().endOf("day")]);
    }
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card className="aca-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Space wrap>
              <Text type="secondary">Date range:</Text>
              <RangePicker
                value={range as any}
                onChange={(v) => {
                  setRange(v as any);
                  setActivePreset(null);
                }}
                allowEmpty={[true, true]}
                placeholder={["Start", "End"]}
              />
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space wrap>
              <Text type="secondary">Window:</Text>
              <Select
                style={{ width: 260 }}
                value={windowId ?? ""}
                onChange={(v) => setWindowId(v || undefined)}
                options={windowOptions}
              />
            </Space>
          </Col>

          <Col
            xs={24}
            md={6}
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <Space wrap>
              <Button
                size="small"
                type={activePreset === "7" ? "primary" : "default"}
                onClick={() => setPreset("7")}
              >
                Last 7 days
              </Button>
              <Button
                size="small"
                type={activePreset === "30" ? "primary" : "default"}
                onClick={() => setPreset("30")}
              >
                Last 30 days
              </Button>
              <Button
                size="small"
                type={activePreset === "this_month" ? "primary" : "default"}
                onClick={() => setPreset("this_month")}
              >
                This month
              </Button>
              <Button
                size="small"
                type={activePreset === "all" ? "primary" : "default"}
                onClick={() => setPreset("all")}
              >
                All time
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Revenue after discounts"
              value={money(kpis.revenue)}
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Uses backend totals only after kg weights are complete
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Discounts applied"
              value={money(kpis.discounts)}
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Gross sales: <b>{money(kpis.grossRevenue)}</b>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic title="Profit" value={money(kpis.profit)} />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Based on current product cost prices and packed weights
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic title="Orders" value={kpis.totalOrders} />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Finalized: <b>{kpis.moneyOrders}</b> · Pending weights:{" "}
              <b>{kpis.pendingWeights}</b>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Avg order value (finalized)"
              value={money(kpis.avgOrder)}
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Average over finalized orders only
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Items sold (packs)"
              value={Math.round(kpis.itemsSold)}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Total Value of Waste"
              value={money(n(totalWasteValue))}
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Based on product cost price and recorded wasted packs/weight
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Avg % Weight Loss"
              value={carcassStats.avgLossPct}
              precision={1}
              suffix="%"
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Based on carcasses with both wet and dry weights
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Delivered %"
              value={kpis.deliveredPct}
              precision={1}
              suffix="%"
            />
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
              Delivered orders ÷ all orders in the selected range and window
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="aca-card" loading={loading}>
            <Statistic
              title="Active products"
              value={kpis.activeProducts}
              suffix={` / ${kpis.totalProducts}`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24}>
          <Card className="aca-card" title="Current stock value by animal / category" loading={loading}>
            <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
              <Col xs={24} sm={12}>
                <Statistic title="Total stock at cost" value={money(stockValuation.totals.costValue)} />
              </Col>
              <Col xs={24} sm={12}>
                <Statistic title="Total stock at retail" value={money(stockValuation.totals.retailValue)} />
              </Col>
            </Row>
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              columns={stockValueCols}
              dataSource={stockValuation.rows}
              locale={{ emptyText: "No stock quantities recorded" }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong>{stockValuation.totals.stockQty.toFixed(0)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><Text strong>{money(stockValuation.totals.costValue)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><Text strong>{money(stockValuation.totals.retailValue)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Uses current product stock counts. Products priced per kilogram use their configured average pack weight. This summary is not affected by the order date or window filters.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24}>
          <Card className="aca-card" loading={loading}>
            <Space wrap>
              {["PROCESSING", "PACKED", "SHIPPING", "DELIVERED"].map((s) => (
                <Tag key={s} color={statusColor(s)}>
                  {s}: {kpis.statusCounts[s] || 0}
                </Tag>
              ))}

              <Tag color="purple">
                Complete carcasses: {carcassStats.completeCount}
              </Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card
            className="aca-card"
            title="Best sellers (by finalized revenue)"
            loading={loading}
          >
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              columns={topProductCols}
              dataSource={topProductsByRevenue}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className="aca-card"
            title="Best sellers (by qty)"
            loading={loading}
          >
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              columns={topProductCols}
              dataSource={topProductsByQty}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24}>
          <Card
            className="aca-card"
            title="Top customers (grouped by phone, finalized spend)"
            loading={loading}
          >
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              columns={topCustomerCols}
              dataSource={topCustomers}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
