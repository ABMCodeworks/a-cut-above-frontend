// src/pages/public/CheckoutPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "../../lib/router";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Select,
  Tag,
  message,
} from "antd";
import {
  LockOutlined,
  ArrowRightOutlined,
  ShoppingCartOutlined,
  MinusOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { api, RAILWAY_BASE } from "../../api/client";
import { useCart } from "../../context/CartContext";
import {
  getStoredDeliveryLocation,
  storeDeliveryLocation,
} from "../../utils/deliveryLocationStorage";

const { Title, Text } = Typography;

type WindowState = {
  open: boolean;
  name?: string;
  endsAt?: string;
  message?: string;
  isPermanent?: boolean;
};

type DropoffLocation = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  minimumOrderValue: number;
  minimumOrderAppliesToWholesale: boolean;
  nextSchedule?: {
    cutoffDate: string;
    deliveryDate: string;
  } | null;
};

type StockIssue = {
  productId: string;
  name?: string;
  requested: number;
  available: number;
  reason: "NOT_FOUND" | "INACTIVE" | "INSUFFICIENT";
};

type DiscountPreview = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  subtotal: number;
  productDiscountTotal: number;
  codeDiscountTotal: number;
  discountTotal: number;
  total: number;
  lines: DiscountPreviewLine[];
};

type DiscountPreviewLine = {
  productId: string;
  lineSubtotal: number;
  productDiscountPercent: number;
  productDiscountTotal: number;
  codeDiscountApplies: boolean;
  codeDiscountTotal: number;
  discountTotal: number;
  lineTotal: number;
};

function asInt(v: any, fallback: number) {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function asMoney(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${RAILWAY_BASE}${url}`;
  return null;
}

function getItemUnitPrice(item: any): number {
  return asMoney(
    item?.price ??
      item?.unitPrice ??
      item?.product?.price ??
      item?.product?.unitPrice ??
      item?.product?.pricePerPack ??
      item?.product?.retailPrice ??
      0,
  );
}

function getItemAvgWeightKg(item: any): number | null {
  const avgWeightG = Number(item?.avgWeightG ?? item?.product?.avgWeightG ?? 0);
  if (!Number.isFinite(avgWeightG) || avgWeightG <= 0) return null;
  return avgWeightG / 1000;
}

function isEstimatedWeightItem(item: any): boolean {
  const unit = String(item?.product?.unit ?? item?.unit ?? "").toLowerCase();
  return unit !== "pack";
}

function getEstimatedLineTotal(item: any): number {
  const qty = asInt(item?.qty, 1);
  const unitPrice = getItemUnitPrice(item);
  const unit = String(item?.product?.unit ?? item?.unit ?? "").toLowerCase();

  if (unit === "pack") {
    return qty * unitPrice;
  }

  const avgWeightKg = getItemAvgWeightKg(item);
  if (!avgWeightKg) {
    return qty * unitPrice;
  }

  return qty * avgWeightKg * unitPrice;
}

function getEstimatedPricingUnits(item: any): number {
  const qty = asInt(item?.qty, 1);
  if (!isEstimatedWeightItem(item)) return qty;

  const avgWeightKg = getItemAvgWeightKg(item);
  return avgWeightKg ? qty * avgWeightKg : qty;
}

function normalizeIntlPhone(phone: string) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

export default function CheckoutPage() {
  const { items, clear, setQty, remove } = useCart();
  const navigate = useNavigate();
  const isWholesale = useMemo(
    () => Boolean(localStorage.getItem("aca_wholesale_pin")),
    [],
  );

  const [windowState, setWindowState] = useState({
    open: isWholesale,
  } as WindowState);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [dropoffs, setDropoffs] = useState([] as DropoffLocation[]);
  const [dropoffsLoading, setDropoffsLoading] = useState(false);
  const [stockIssuesById, setStockIssuesById] = useState(
    {} as Record<string, StockIssue>,
  );
  const [stockChecking, setStockChecking] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountPreview, setDiscountPreview] = useState(
    null as DiscountPreview | null,
  );
  const [discountChecking, setDiscountChecking] = useState(false);

  const [phoneValue, setPhoneValue] = useState("+263");

  async function loadWindow() {
    try {
      const wRes = await api.get("/api/public/order-window");
      setWindowState(wRes.data);
    } catch {
      setWindowState({ open: false, message: "Unable to check order window" });
    }
  }

  async function loadDropoffs() {
    setDropoffsLoading(true);
    try {
      const res = await api.get("/api/public/dropoff-locations");
      const list = (res.data?.locations || []) as any[];

      const parsed: DropoffLocation[] = list.map((x) => ({
        id: String(x.id),
        name: String(x.name),
        description: x.description ?? null,
        isActive: Boolean(x.isActive),
        sortOrder: Number(x.sortOrder ?? 0),
        minimumOrderValue: Number(x.minimumOrderValue ?? 0),
        minimumOrderAppliesToWholesale: Boolean(
          x.minimumOrderAppliesToWholesale,
        ),
        nextSchedule: x.nextSchedule ?? null,
      }));

      setDropoffs(parsed);

      const current = form.getFieldValue("dropoffLocationId");
      const activeSorted = parsed
        .filter((d) => d.isActive)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );

      // Carry through the delivery location the customer picked on the shop page.
      const saved = getStoredDeliveryLocation();
      const savedValid =
        saved && activeSorted.some((d) => d.id === saved) ? saved : null;

      const next = savedValid || activeSorted[0]?.id;

      if (!current && next) {
        form.setFieldsValue({ dropoffLocationId: next });
      }
    } catch (e: any) {
      console.error(e);
      setDropoffs([]);
    } finally {
      setDropoffsLoading(false);
    }
  }

  useEffect(() => {
    if (isWholesale) {
      setWindowState({ open: true });
    } else {
      loadWindow();
    }
    loadDropoffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWholesale]);

  const selectedDropoffId = Form.useWatch("dropoffLocationId", form);

  const selectedDropoff = useMemo(() => {
    return dropoffs.find((d) => d.id === selectedDropoffId) ?? null;
  }, [dropoffs, selectedDropoffId]);

  const isMutare = useMemo(() => {
    return /mutare/i.test(selectedDropoff?.name || "");
  }, [selectedDropoff]);

  const cartSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + getEstimatedLineTotal(it), 0);
  }, [items]);

  const cartSignature = useMemo(
    () => items.map((i) => `${i.product.id}:${Number(i.qty || 0)}`).join("|"),
    [items],
  );

  const cartTotalAfterCode = discountPreview
    ? discountPreview.total
    : cartSubtotal;

  const discountLinesByProductId = useMemo(
    () =>
      new Map(
        (discountPreview?.lines || []).map((line) => [line.productId, line]),
      ),
    [discountPreview],
  );

  const hasEstimatedPricing = useMemo(() => {
    return items.some((it) => isEstimatedWeightItem(it));
  }, [items]);

  const deliveryInfo = useMemo(() => {
    const schedule = selectedDropoff?.nextSchedule ?? null;
    const cutoff = schedule?.cutoffDate ? new Date(schedule.cutoffDate) : null;
    const nextDelivery = schedule?.deliveryDate
      ? new Date(schedule.deliveryDate)
      : null;
    return { has: Boolean(cutoff && nextDelivery), cutoff, nextDelivery };
  }, [selectedDropoff]);

  const deliveryScheduleAvailable =
    isWholesale || Boolean(selectedDropoff && deliveryInfo.has);

  async function runStockCheck() {
    if (!items.length) {
      setStockIssuesById({});
      return { ok: true as const, issues: [] as StockIssue[] };
    }
    setStockChecking(true);
    try {
      await api.post("/api/public/orders/stock-check", {
        items: items.map((i) => ({
          productId: i.product.id,
          qty: Number(i.qty || 0),
        })),
      });
      setStockIssuesById({});
      return { ok: true as const, issues: [] as StockIssue[] };
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const issues = (e?.response?.data?.issues || []) as StockIssue[];
        const map: Record<string, StockIssue> = {};
        for (const it of issues) map[String(it.productId)] = it;
        setStockIssuesById(map);
        return { ok: false as const, issues };
      }
      console.error("Stock check error:", e);
      return { ok: true as const, issues: [] as StockIssue[] };
    } finally {
      setStockChecking(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      runStockCheck();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]);

  useEffect(() => {
    setDiscountPreview(null);
  }, [cartSignature]);

  async function applyDiscountCode() {
    const code = discountCodeInput.trim();
    if (!code) {
      setDiscountPreview(null);
      return;
    }
    if (!items.length) return;

    setDiscountChecking(true);
    try {
      const res = await api.post("/api/public/discount-codes/preview", {
        code,
        items: items.map((i) => ({
          productId: i.product.id,
          qty: Number(i.qty || 0),
        })),
      });
      setDiscountPreview(res.data as DiscountPreview);
      setDiscountCodeInput(String(res.data?.code || code).toUpperCase());
      message.success("Discount code applied");
    } catch (e: any) {
      setDiscountPreview(null);
      message.error(e?.response?.data?.error || "Discount code not valid");
    } finally {
      setDiscountChecking(false);
    }
  }

  function issueUi(issue?: StockIssue | null) {
    if (!issue) return null;
    const hardOut =
      issue.available <= 0 ||
      issue.reason === "INACTIVE" ||
      issue.reason === "NOT_FOUND";

    if (hardOut) {
      return {
        icon: <CloseCircleOutlined />,
        color: "#cf1322",
        title: "Sold out",
        subtitle:
          issue.reason === "INACTIVE"
            ? "This item is currently unavailable."
            : issue.reason === "NOT_FOUND"
              ? "This item no longer exists."
              : "No stock available.",
      };
    }
    return {
      icon: <ExclamationCircleOutlined />,
      color: "#d48806",
      title: "Low stock",
      subtitle: `Only ${issue.available} available — please reduce quantity.`,
    };
  }

  const hasBlockingIssues = useMemo(() => {
    return Object.keys(stockIssuesById).length > 0;
  }, [stockIssuesById]);

  const minimumOrderValue = Number(selectedDropoff?.minimumOrderValue || 0);
  const minimumOrderApplies =
    minimumOrderValue > 0 &&
    (!isWholesale ||
      Boolean(selectedDropoff?.minimumOrderAppliesToWholesale));
  const minimumOrderMet =
    !minimumOrderApplies || cartSubtotal >= minimumOrderValue;

  async function doSubmit(values: any) {
    const customerName = String(values.customerName || "").trim();
    const customerPhone = normalizeIntlPhone(phoneValue);
    const dropoffLocationId = String(values.dropoffLocationId || "").trim();
    const personalAddress = String(values.personalAddress || "").trim();
    const businessName = String(values.businessName || "").trim();
    const customerEmail = String(values.customerEmail || "").trim();
    const notes = String(values.notes || "").trim();
    const requestedDeliveryDate = values.requestedDeliveryDate
      ? values.requestedDeliveryDate.format("YYYY-MM-DD")
      : "";

    if (items.length === 0) return;
    if (!isWholesale && !windowState.open) return;

    setSubmitting(true);
    try {
      const check = await runStockCheck();
      if (!check.ok) return;

      const payload = {
        customerName,
        customerPhone,
        customerEmail: isWholesale ? customerEmail : "",
        businessName: isWholesale ? businessName : "",
        requestedDeliveryDate: isWholesale ? requestedDeliveryDate : "",
        dropoffLocationId,
        personalAddress: isWholesale
          ? personalAddress
          : isMutare
            ? personalAddress
            : "",
        notes: isWholesale ? notes : "",
        discountCode: discountPreview?.code ?? discountCodeInput.trim(),
        legalAccepted: values.legalAccepted === true,
        whatsAppConsent: values.whatsAppConsent === true,
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
      };

      const res = await api.post("/api/public/orders", payload);

      clear();
      form.resetFields();
      setPhoneValue("+263");

      navigate("/track", {
        replace: true,
        state: {
          successOrderNo: res.data?.orderNo,
          successDeliveryDate:
            res.data?.deliverySchedule?.deliveryDate ??
            res.data?.requestedDeliveryDate ??
            res.data?.deliveryDate ??
            deliveryInfo.nextDelivery?.toISOString() ??
            null,
        },
      });
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const issues = (e?.response?.data?.issues || []) as StockIssue[];
        const map: Record<string, StockIssue> = {};
        for (const it of issues) map[String(it.productId)] = it;
        setStockIssuesById(map);
        return;
      }
      message.error(e?.response?.data?.error || "Order failed");
      console.error("Order failed:", e?.response?.data || e);
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(values: any) {
    if (items.length === 0) return;
    if (!isWholesale && !windowState.open) return;

    if (normalizeIntlPhone(phoneValue).length < 8) {
      form.setFields([
        {
          name: "customerPhone",
          errors: ["Please enter a valid phone number"],
        },
      ]);
      return;
    }

    if (!minimumOrderMet) {
      form.setFields([
        {
          name: "dropoffLocationId",
          errors: [
            `${selectedDropoff?.name || "This location"} orders must be at least $${minimumOrderValue.toFixed(2)}.`,
          ],
        },
      ]);
      return;
    }

    if (!isWholesale && !deliveryScheduleAvailable) {
      form.setFields([
        {
          name: "dropoffLocationId",
          errors: ["Choose a delivery location with an upcoming schedule."],
        },
      ]);
      return;
    }

    await doSubmit(values);
  }

  return (
    <div className="aca-page">
      <div className="aca-page__top" style={{ alignItems: "center" }}>
        <div>
          <Title
            level={2}
            className="aca-displayTitle"
            style={{ marginBottom: 4 }}
          >
            {isWholesale ? "Wholesale Checkout" : "Secure Checkout"}
          </Title>
          <Text className="aca-subtitle">
            {isWholesale
              ? "Tell us about your business and when you need the order."
              : "Enter your details to receive your premium cuts."}
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LockOutlined style={{ opacity: 0.65 }} />
          <Text type="secondary" style={{ letterSpacing: 1, fontWeight: 600 }}>
            SECURE
          </Text>
        </div>
      </div>

      {!isWholesale && !windowState.open ? (
        <Alert
          type="warning"
          message={windowState.message || "Ordering is closed."}
          showIcon
          className="aca-alert"
          style={{ marginTop: 14 }}
        />
      ) : null}

      {!isWholesale && selectedDropoff ? (
        <div style={{ marginTop: 10, marginBottom: 12 }}>
          {deliveryInfo.has ? (
            <Alert
              type="info"
              showIcon
              className="aca-checkoutSchedule"
              message={
                <span>
                  <b>{selectedDropoff.name}</b>
                  <span> • Cut-off: </span>
                  <b>{deliveryInfo.cutoff!.toLocaleDateString()}</b>
                  <span> • Delivery: </span>
                  <b>{deliveryInfo.nextDelivery!.toLocaleDateString()}</b>
                </span>
              }
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              className="aca-checkoutSchedule"
              message={
                selectedDropoff
                  ? `No upcoming delivery scheduled for ${selectedDropoff.name}`
                  : "No upcoming delivery scheduled"
              }
            />
          )}
        </div>
      ) : null}

      <div className="aca-checkoutGrid">
        <div style={{ display: "grid", gap: 16 }}>
          <Card className="aca-card">
            <Title level={3} style={{ marginTop: 0 }}>
              {isWholesale ? "Business Details" : "Your Details"}
            </Title>
            <Text type="secondary">
              {isWholesale
                ? "All details are entered manually. We will confirm delivery arrangements with your business."
                : "Choose where you'd like your order dropped."}
            </Text>

            <Divider />

            <Form layout="vertical" form={form} onFinish={submit}>
              {isWholesale ? (
                <Form.Item
                  name="businessName"
                  label={
                    <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                      BUSINESS NAME
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please enter the business name" },
                    {
                      min: 2,
                      message: "Business name must be at least 2 characters",
                    },
                  ]}
                  normalize={(v) => String(v || "")}
                >
                  <Input placeholder="e.g. Sterling Butchery" />
                </Form.Item>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Form.Item
                  name="customerName"
                  label={
                    <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                      {isWholesale ? "POINT OF CONTACT" : "FULL NAME"}
                    </span>
                  }
                  rules={[
                    {
                      required: true,
                      message: isWholesale
                        ? "Please enter a point of contact"
                        : "Please enter your name",
                    },
                    {
                      validator: (_, value) => {
                        if (String(value || "").trim().length >= 2) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          "Name must be at least 2 characters",
                        );
                      },
                    },
                  ]}
                  normalize={(v) => String(v || "")}
                >
                  <Input
                    placeholder={
                      isWholesale ? "Contact person's name" : "e.g. James Sterling"
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="customerPhone"
                  label={
                    <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                      PHONE
                    </span>
                  }
                  rules={[
                    {
                      validator: () => {
                        if (normalizeIntlPhone(phoneValue).length >= 8) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          "Please enter a valid phone number",
                        );
                      },
                    },
                  ]}
                >
                  <div
                    style={{
                      border: "1px solid #d9d9d9",
                      borderRadius: 6,
                      padding: 1,
                    }}
                  >
                    <PhoneInput
                      defaultCountry="zw"
                      value={phoneValue}
                      onChange={(phone) => {
                        setPhoneValue(phone);
                        form.setFieldValue("customerPhone", phone);
                      }}
                      inputStyle={{
                        width: "100%",
                        border: "none",
                        boxShadow: "none",
                        height: 30,
                      }}
                      countrySelectorStyleProps={{
                        buttonStyle: {
                          border: "none",
                          borderRight: "1px solid #f0f0f0",
                          height: 30,
                        },
                        dropdownStyleProps: {
                          style: {
                            zIndex: 1200,
                          },
                        },
                      }}
                    />
                  </div>
                </Form.Item>

                {isWholesale ? (
                  <Form.Item
                    name="customerEmail"
                    label={
                      <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                        BUSINESS EMAIL
                      </span>
                    }
                    rules={[{ type: "email", message: "Enter a valid email" }]}
                  >
                    <Input type="email" placeholder="Optional" />
                  </Form.Item>
                ) : null}

                {isWholesale ? (
                  <Form.Item
                    name="requestedDeliveryDate"
                    label={
                      <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                        REQUESTED DELIVERY DATE
                      </span>
                    }
                    extra="Tell us when you need the order. We will confirm the final date."
                    rules={[
                      {
                        required: true,
                        message: "Please choose a requested delivery date",
                      },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="D MMM YYYY"
                      placeholder="Select requested date"
                    />
                  </Form.Item>
                ) : null}
              </div>

              {minimumOrderApplies ? (
                <Alert
                  type={minimumOrderMet ? "info" : "error"}
                  showIcon
                  message={`${selectedDropoff?.name || "Delivery location"} order requirements`}
                  description={
                    <div style={{ display: "grid", gap: 4 }}>
                      <div>
                        Minimum order value:{" "}
                        <b>${minimumOrderValue.toFixed(2)}</b>
                      </div>
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                />
              ) : null}

              <Form.Item
                name="dropoffLocationId"
                label={
                  <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                    DELIVERY LOCATION
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: "Please choose a delivery location",
                  },
                ]}
              >
                <Select
                  loading={dropoffsLoading}
                  placeholder="Select a delivery location"
                  onChange={(v) => {
                    if (v) storeDeliveryLocation(v);
                  }}
                  options={dropoffs
                    .filter((d) => d.isActive)
                    .sort(
                      (a, b) =>
                        a.sortOrder - b.sortOrder ||
                        a.name.localeCompare(b.name),
                    )
                    .map((d) => ({
                      value: d.id,
                      label: d.description
                        ? `${d.name} — ${d.description}`
                        : d.name,
                    }))}
                />
              </Form.Item>

              {!isWholesale ? (
                isMutare ? (
                  <Form.Item
                    name="personalAddress"
                    label={
                      <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                        PERSONAL ADDRESS
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: "Please enter your personal address for Mutare",
                      },
                      {
                        validator: (_, value) => {
                          if (String(value || "").trim().length >= 6) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            "Address must be at least 6 characters",
                          );
                        },
                      },
                    ]}
                    normalize={(v) => String(v || "")}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Enter your full personal address"
                    />
                  </Form.Item>
                ) : null
              ) : (
                <>
                  <Form.Item
                    name="personalAddress"
                    label={
                      <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                        DELIVERY ADDRESS / AREA
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: "Please enter the business delivery address",
                      },
                      {
                        min: 6,
                        message: "Address must be at least 6 characters",
                      },
                    ]}
                    normalize={(v) => String(v || "")}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Enter the full delivery address and area"
                    />
                  </Form.Item>

                  <Form.Item
                    name="notes"
                    label={
                      <span style={{ letterSpacing: 1, fontWeight: 800 }}>
                        DELIVERY NOTES
                      </span>
                    }
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Access instructions or other business requirements (optional)"
                    />
                  </Form.Item>
                </>
              )}

              <Divider />

              <Form.Item
                name="legalAccepted"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Please accept the shop terms and privacy notice"),
                          ),
                  },
                ]}
              >
                <Checkbox>
                  I accept the <Link to="/terms">Shop Terms</Link> and acknowledge
                  the <Link to="/privacy">Privacy Notice</Link> describing the use
                  of my details to process and fulfil this order.
                </Checkbox>
              </Form.Item>

              <Form.Item name="whatsAppConsent" valuePropName="checked">
                <Checkbox>
                  Send optional order-status updates to this phone number by WhatsApp.
                  I can withdraw this choice at any time through the{" "}
                  <Link to="/privacy-rights">privacy choices page</Link>.
                </Checkbox>
              </Form.Item>

              <Divider />

              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Button
                  onClick={() => navigate("/products")}
                  icon={<ShoppingCartOutlined />}
                >
                  Back to shop
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  disabled={
                    (!isWholesale && !windowState.open) ||
                    items.length === 0 ||
                    hasBlockingIssues ||
                    !minimumOrderMet ||
                    !deliveryScheduleAvailable
                  }
                  icon={<LockOutlined />}
                  className="aca-cartBtn"
                >
                  Place order <ArrowRightOutlined />
                </Button>
              </Space>

              {hasBlockingIssues ? (
                <div style={{ marginTop: 10 }}>
                  <Text strong style={{ color: "#cf1322" }}>
                    Fix your cart items on the right before placing the order.
                  </Text>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--aca-muted)",
                      marginTop: 2,
                    }}
                  >
                    Items marked in red/orange need quantity changes or removal.
                  </div>
                </div>
              ) : null}

              {!minimumOrderMet ? (
                <div style={{ marginTop: 10 }}>
                  <Text strong style={{ color: "#d48806" }}>
                    {selectedDropoff?.name || "This location"} orders must be at
                    least ${minimumOrderValue.toFixed(2)}.
                  </Text>
                </div>
              ) : null}

              {!isWholesale && !deliveryScheduleAvailable ? (
                <div style={{ marginTop: 10 }}>
                  <Text strong style={{ color: "#d48806" }}>
                    This delivery location does not have an upcoming delivery
                    scheduled yet.
                  </Text>
                </div>
              ) : null}
            </Form>
          </Card>
        </div>

        <aside>
          <div style={{ position: "sticky", top: 120 }}>
            <Card className="aca-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
                  Quick Summary
                </Title>
                <Tag
                  color={
                    stockChecking ? "gold" : hasBlockingIssues ? "red" : "green"
                  }
                >
                  {stockChecking
                    ? "Checking stock…"
                    : hasBlockingIssues
                      ? "Action needed"
                      : "OK"}
                </Tag>
              </div>

              <Divider style={{ margin: "12px 0" }} />

              <div
                style={{
                  marginBottom: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "var(--aca-forest)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 13, opacity: 0.85, fontWeight: 700 }}>
                    CART TOTAL
                  </span>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
                  ${cartTotalAfterCode.toFixed(2)}
                </div>
              </div>

              {discountPreview ? (
                <div
                  style={{
                    display: "grid",
                    gap: 4,
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(22,119,255,0.25)",
                    background: "rgba(22,119,255,0.06)",
                  }}
                >
                  <Space style={{ justifyContent: "space-between" }}>
                    <Text strong>Discount code</Text>
                    <Tag color="blue">{discountPreview.code}</Tag>
                  </Space>
                  <Space style={{ justifyContent: "space-between" }}>
                    <Text type="secondary">Subtotal before code</Text>
                    <Text>${cartSubtotal.toFixed(2)}</Text>
                  </Space>
                  <Space style={{ justifyContent: "space-between" }}>
                    <Text type="secondary">Code discount</Text>
                    <Text strong style={{ color: "var(--aca-forest)" }}>
                      -${Number(discountPreview.codeDiscountTotal || 0).toFixed(2)}
                    </Text>
                  </Space>
                </div>
              ) : null}

              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ display: "block", marginBottom: 6 }}>
                  Discount code
                </Text>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    value={discountCodeInput}
                    onChange={(e) => {
                      setDiscountCodeInput(e.target.value.toUpperCase());
                      setDiscountPreview(null);
                    }}
                    onPressEnter={applyDiscountCode}
                    placeholder="Enter code"
                  />
                  <Button
                    loading={discountChecking}
                    onClick={applyDiscountCode}
                    disabled={!discountCodeInput.trim() || !items.length}
                  >
                    Apply
                  </Button>
                </Space.Compact>
                {discountPreview ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setDiscountPreview(null);
                      setDiscountCodeInput("");
                    }}
                    style={{ paddingLeft: 0 }}
                  >
                    Remove code
                  </Button>
                ) : null}
              </div>

              {hasEstimatedPricing ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Estimated total"
                  description="This subtotal is only an estimate for weight-based items. Your final price will be confirmed and sent to you once packing is completed."
                />
              ) : null}

              {items.length === 0 ? (
                <Text type="secondary">No items yet.</Text>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((it) => {
                    const pid = it.product.id;
                    const qty = asInt(it.qty, 1);
                    const issue = stockIssuesById[pid] || null;
                    const ui = issueUi(issue);
                    const maxIfKnown =
                      issue &&
                      issue.reason === "INSUFFICIENT" &&
                      Number(issue.available) > 0
                        ? Number(issue.available)
                        : undefined;
                    const disablePlus =
                      typeof maxIfKnown === "number"
                        ? qty >= maxIfKnown
                        : false;
                    const imgSrc = resolveImageUrl(
                      (it.product as any).imageUrl,
                    );
                    const unitPrice = getItemUnitPrice(it);
                    const lineTotal = getEstimatedLineTotal(it);
                    const avgWeightKg = getItemAvgWeightKg(it);
                    const isEstimated = isEstimatedWeightItem(it);
                    const discountLine = discountLinesByProductId.get(pid);
                    const pricingUnits = getEstimatedPricingUnits(it);
                    const productOriginalUnitPrice = asMoney(
                      (it.product as any).originalPrice,
                    );
                    const hasStoredProductDiscount =
                      Number((it.product as any).discountPercent || 0) > 0 &&
                      productOriginalUnitPrice > unitPrice;
                    const hasCodeDiscount =
                      Number(discountLine?.codeDiscountTotal || 0) > 0;
                    const hasProductDiscount = discountLine
                      ? Number(discountLine.productDiscountTotal || 0) > 0
                      : hasStoredProductDiscount;
                    const hasLineDiscount =
                      hasCodeDiscount || hasProductDiscount;
                    const originalLineTotal = discountLine
                      ? Number(discountLine.lineSubtotal)
                      : hasStoredProductDiscount
                        ? productOriginalUnitPrice * pricingUnits
                        : lineTotal;
                    const discountedLineTotal = discountLine
                      ? Number(discountLine.lineTotal)
                      : lineTotal;
                    const originalUnitPrice =
                      pricingUnits > 0
                        ? originalLineTotal / pricingUnits
                        : unitPrice;
                    const discountedUnitPrice =
                      pricingUnits > 0
                        ? discountedLineTotal / pricingUnits
                        : unitPrice;
                    const discountBadge =
                      hasCodeDiscount && hasProductDiscount
                        ? "SALE + CODE"
                        : hasCodeDiscount
                          ? `${discountPreview?.code || "CODE"} APPLIED`
                          : `${Number((it.product as any).discountPercent || discountLine?.productDiscountPercent || 0).toFixed(0)}% OFF`;

                    return (
                      <div
                        key={pid}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: `1px solid ${
                            ui
                              ? ui.color === "#cf1322"
                                ? "rgba(207,19,34,0.35)"
                                : "rgba(212,136,6,0.35)"
                              : "var(--aca-border)"
                          }`,
                          background: ui
                            ? "rgba(0,0,0,0.02)"
                            : "var(--aca-bg2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                overflow: "hidden",
                                background: "var(--aca-card)",
                                border: "1px solid var(--aca-border)",
                                flexShrink: 0,
                              }}
                            >
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={it.product.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    (
                                      e.currentTarget as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : null}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <Text
                                strong
                                style={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: "16px",
                                }}
                              >
                                {it.product.name}
                              </Text>

                              {unitPrice > 0 ? (
                                <div style={{ display: "grid", gap: 2 }}>
                                  {hasLineDiscount ? (
                                    <>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 6,
                                          alignItems: "center",
                                          flexWrap: "wrap",
                                          marginTop: 3,
                                        }}
                                      >
                                        <Tag
                                          color="green"
                                          style={{ marginInlineEnd: 0 }}
                                        >
                                          {discountBadge}
                                        </Tag>
                                        <Text
                                          delete
                                          type="secondary"
                                          style={{ fontSize: 12 }}
                                        >
                                          ${originalUnitPrice.toFixed(2)}
                                        </Text>
                                        <Text
                                          strong
                                          style={{
                                            color: "var(--aca-forest)",
                                            fontSize: 14,
                                          }}
                                        >
                                          ${discountedUnitPrice.toFixed(2)}
                                        </Text>
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: 12 }}
                                        >
                                          × {qty}
                                        </Text>
                                      </div>

                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 7,
                                          alignItems: "baseline",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <Text strong style={{ fontSize: 13 }}>
                                          Item total:
                                        </Text>
                                        <Text delete type="secondary">
                                          ${originalLineTotal.toFixed(2)}
                                        </Text>
                                        <Text
                                          style={{
                                            fontSize: 16,
                                            fontWeight: 900,
                                            color: "var(--aca-forest)",
                                          }}
                                        >
                                          ${discountedLineTotal.toFixed(2)}
                                        </Text>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        {`$${unitPrice.toFixed(2)} × ${qty}`}
                                      </Text>

                                      <Text
                                        style={{
                                          fontSize: 15,
                                          fontWeight: 800,
                                          color: "var(--aca-forest)",
                                        }}
                                      >
                                        Item total: ${lineTotal.toFixed(2)}
                                      </Text>
                                    </>
                                  )}

                                  {isEstimated ? (
                                    <Text
                                      type="warning"
                                      style={{ fontSize: 12 }}
                                    >
                                      Estimated from average weight
                                    </Text>
                                  ) : null}
                                </div>
                              ) : null}

                              {ui ? (
                                <div
                                  style={{
                                    marginTop: 4,
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    color: ui.color,
                                  }}
                                >
                                  <span style={{ marginTop: 2 }}>
                                    {ui.icon}
                                  </span>
                                  <div style={{ lineHeight: 1.2 }}>
                                    <div style={{ fontWeight: 800 }}>
                                      {ui.title}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                                      {ui.subtitle}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(pid)}
                          />
                        </div>

                        {ui ? (
                          <div style={{ marginTop: 10 }}>
                            <Text strong style={{ color: ui.color }}>
                              Please fix this item before placing the order
                            </Text>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--aca-muted)",
                                marginTop: 2,
                              }}
                            >
                              Reduce qty to available stock or remove it.
                            </div>
                          </div>
                        ) : null}

                        <div
                          style={{
                            marginTop: ui ? 8 : 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text type="secondary">Qty (packs)</Text>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              border: "1px solid var(--aca-border)",
                              background: "var(--aca-card)",
                              borderRadius: 999,
                              padding: "4px 6px",
                            }}
                          >
                            <Button
                              size="small"
                              type="text"
                              icon={<MinusOutlined />}
                              disabled={qty <= 1}
                              onClick={() => setQty(pid, Math.max(1, qty - 1))}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                padding: 0,
                              }}
                            />
                            <InputNumber
                              value={qty}
                              min={1}
                              max={maxIfKnown}
                              controls={false}
                              onChange={(v) => setQty(pid, asInt(v, 1))}
                              style={{ width: 52 }}
                            />
                            <Button
                              size="small"
                              type="text"
                              icon={<PlusOutlined />}
                              disabled={disablePlus}
                              onClick={() => setQty(pid, qty + 1)}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                padding: 0,
                              }}
                            />
                          </div>
                        </div>

                        {typeof maxIfKnown === "number" ? (
                          <div style={{ marginTop: 6 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Max available right now: <b>{maxIfKnown}</b>
                            </Text>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </aside>
      </div>

    </div>
  );
}
