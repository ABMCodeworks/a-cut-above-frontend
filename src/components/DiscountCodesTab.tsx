import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CopyOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { api } from "../api/client";
import type {
  AdminDiscountCode,
  AdminProduct,
} from "../pages/admin/AdminDashboardPage";

const { Text } = Typography;

type DiscountForm = {
  discountType: "PERCENT" | "FIXED";
  value: number;
  appliesToAllProducts: boolean;
  productIds?: string[];
  expiresAt: any;
  isActive: boolean;
  maxRedemptions?: number | null;
};

type ProductDiscountForm = {
  productId: string;
  discountPercent: number;
  discountStartsAt?: any;
  discountExpiresAt?: any;
};

function money(v: string | number | null | undefined) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

function formatDiscount(code: AdminDiscountCode) {
  return code.discountType === "PERCENT"
    ? `${Number(code.value).toFixed(0)}% off`
    : `${money(code.value)} off`;
}

function isExpired(code: AdminDiscountCode) {
  return new Date(code.expiresAt).getTime() < Date.now();
}

function productDiscountStatus(product: AdminProduct) {
  const now = Date.now();
  const startsAt = product.discountStartsAt
    ? new Date(product.discountStartsAt).getTime()
    : null;
  const expiresAt = product.discountExpiresAt
    ? new Date(product.discountExpiresAt).getTime()
    : null;

  if (expiresAt !== null && expiresAt <= now) {
    return <Tag color="default">Expired</Tag>;
  }
  if (startsAt !== null && startsAt > now) {
    return <Tag color="blue">Scheduled</Tag>;
  }
  return <Tag color="green">Active</Tag>;
}

export default function DiscountCodesTab({
  loading,
  products,
  codes,
  onReload,
}: {
  loading: boolean;
  products: AdminProduct[];
  codes: AdminDiscountCode[];
  onReload: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDiscountCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<DiscountForm>();
  const appliesToAll = Form.useWatch("appliesToAllProducts", form);
  const discountType = Form.useWatch("discountType", form) ?? "PERCENT";
  const [productDiscountModalOpen, setProductDiscountModalOpen] =
    useState(false);
  const [editingProductDiscount, setEditingProductDiscount] =
    useState<AdminProduct | null>(null);
  const [productDiscountSaving, setProductDiscountSaving] = useState(false);
  const [productDiscountForm] = Form.useForm<ProductDiscountForm>();
  const [productDiscountSearch, setProductDiscountSearch] = useState("");

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.isActive && !p.isForProcessing)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          value: p.id,
          label: p.category?.name ? `${p.name} (${p.category.name})` : p.name,
        })),
    [products],
  );

  const discountedProducts = useMemo(
    () =>
      products
        .filter((product) => Number(product.discountPercent ?? 0) > 0)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const visibleDiscountedProducts = useMemo(() => {
    const query = productDiscountSearch.trim().toLowerCase();
    if (!query) return discountedProducts;

    return discountedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.category?.name || "").toLowerCase().includes(query),
    );
  }, [discountedProducts, productDiscountSearch]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      discountType: "PERCENT",
      value: 10,
      appliesToAllProducts: true,
      productIds: [],
      expiresAt: dayjs().add(7, "day").endOf("day"),
      isActive: true,
      maxRedemptions: null,
    });
    setModalOpen(true);
  }

  function openEdit(code: AdminDiscountCode) {
    setEditing(code);
    form.resetFields();
    form.setFieldsValue({
      discountType: code.discountType,
      value: Number(code.value),
      appliesToAllProducts: code.appliesToAllProducts,
      productIds: (code.products || []).map((p) => p.productId),
      expiresAt: dayjs(code.expiresAt),
      isActive: code.isActive,
      maxRedemptions: code.maxRedemptions ?? null,
    });
    setModalOpen(true);
  }

  function openProductDiscount(product?: AdminProduct) {
    setEditingProductDiscount(product ?? null);
    productDiscountForm.resetFields();
    productDiscountForm.setFieldsValue({
      productId: product?.id,
      discountPercent: product
        ? Number(product.discountPercent ?? 0)
        : 10,
      discountStartsAt: product?.discountStartsAt
        ? dayjs(product.discountStartsAt)
        : dayjs(),
      discountExpiresAt: product?.discountExpiresAt
        ? dayjs(product.discountExpiresAt)
        : dayjs().add(7, "day").endOf("day"),
    });
    setProductDiscountModalOpen(true);
  }

  async function saveProductDiscount() {
    const values = await productDiscountForm.validateFields();
    const toIso = (value: any) =>
      value?.toDate
        ? value.toDate().toISOString()
        : value
          ? new Date(value).toISOString()
          : null;

    setProductDiscountSaving(true);
    try {
      await api.put(`/api/admin/products/${values.productId}/discount`, {
        discountPercent: Number(values.discountPercent),
        discountStartsAt: toIso(values.discountStartsAt),
        discountExpiresAt: toIso(values.discountExpiresAt),
      });
      message.success("Product discount saved");
      setProductDiscountModalOpen(false);
      setEditingProductDiscount(null);
      onReload();
    } catch (e: any) {
      message.error(
        e?.response?.data?.error || "Could not save product discount",
      );
    } finally {
      setProductDiscountSaving(false);
    }
  }

  async function removeProductDiscount(product: AdminProduct) {
    try {
      await api.put(`/api/admin/products/${product.id}/discount`, {
        discountPercent: 0,
        discountStartsAt: null,
        discountExpiresAt: null,
      });
      message.success("Product discount removed");
      onReload();
    } catch (e: any) {
      message.error(
        e?.response?.data?.error || "Could not remove product discount",
      );
    }
  }

  async function save() {
    const values = await form.validateFields();
    const expiresAt = values.expiresAt?.toDate
      ? values.expiresAt.toDate().toISOString()
      : new Date(values.expiresAt).toISOString();

    const payload = {
      discountType: values.discountType,
      value: Number(values.value || 0),
      appliesToAllProducts: Boolean(values.appliesToAllProducts),
      productIds: values.appliesToAllProducts ? [] : values.productIds || [],
      expiresAt,
      isActive: Boolean(values.isActive),
      maxRedemptions: values.maxRedemptions ? Number(values.maxRedemptions) : null,
    };

    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/api/admin/discount-codes/${editing.id}`, payload)
        : await api.post("/api/admin/discount-codes", payload);

      const generated = res.data?.code?.code;
      message.success(
        editing
          ? "Discount code updated"
          : `Discount code generated: ${generated}`,
      );
      setModalOpen(false);
      setEditing(null);
      onReload();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Could not save discount code");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(code: AdminDiscountCode) {
    try {
      await api.delete(`/api/admin/discount-codes/${code.id}`);
      message.success("Discount code deactivated");
      onReload();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Could not deactivate code");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      message.success("Code copied");
    } catch {
      message.info(code);
    }
  }

  const columns: ColumnsType<AdminDiscountCode> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (v: string) => (
        <Space>
          <Text strong>{v}</Text>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyCode(v)}
          />
        </Space>
      ),
    },
    {
      title: "Discount",
      key: "discount",
      render: (_, code) => formatDiscount(code),
    },
    {
      title: "Applies To",
      key: "applies",
      render: (_, code) =>
        code.appliesToAllProducts ? (
          <Tag color="blue">All products</Tag>
        ) : (
          <span>
            {(code.products || []).slice(0, 3).map((p) => p.product?.name).join(", ")}
            {(code.products || []).length > 3
              ? ` +${(code.products || []).length - 3} more`
              : ""}
          </span>
        ),
    },
    {
      title: "Expires",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (v: string, code) => (
        <Tag color={isExpired(code) ? "red" : "green"}>
          {dayjs(v).format("D MMM YYYY")}
        </Tag>
      ),
    },
    {
      title: "Uses",
      key: "uses",
      render: (_, code) =>
        `${Number(code.redemptionCount || 0)}${
          code.maxRedemptions ? ` / ${code.maxRedemptions}` : ""
        }`,
    },
    {
      title: "Status",
      key: "status",
      render: (_, code) =>
        code.isActive && !isExpired(code) ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="default">{isExpired(code) ? "Expired" : "Inactive"}</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, code) => (
        <Space>
          <Button size="small" onClick={() => openEdit(code)}>
            Edit
          </Button>
          {code.isActive ? (
            <Popconfirm
              title="Deactivate this discount code?"
              onConfirm={() => deactivate(code)}
            >
              <Button size="small" danger>
                Deactivate
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const productDiscountColumns: ColumnsType<AdminProduct> = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (_, product) => (
        <Space>
          <Text strong>{product.name}</Text>
          {product.category?.name ? <Tag>{product.category.name}</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Discount",
      dataIndex: "discountPercent",
      key: "discountPercent",
      render: (value) => `${Number(value).toFixed(2)}% off`,
    },
    {
      title: "Starts",
      dataIndex: "discountStartsAt",
      key: "discountStartsAt",
      render: (value) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "Immediately",
    },
    {
      title: "Expires",
      dataIndex: "discountExpiresAt",
      key: "discountExpiresAt",
      render: (value) =>
        value ? dayjs(value).format("D MMM YYYY, HH:mm") : "No expiry",
    },
    {
      title: "Status",
      key: "status",
      render: (_, product) => productDiscountStatus(product),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, product) => (
        <Space>
          <Button size="small" onClick={() => openProductDiscount(product)}>
            Edit
          </Button>
          <Popconfirm
            title="Remove this product discount?"
            onConfirm={() => removeProductDiscount(product)}
          >
            <Button size="small" danger>
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Discounts"
      extra={
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Generate Discount Code
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => openProductDiscount()}
          >
            Discount a Product for Everyone
          </Button>
        </Space>
      }
    >
      <Typography.Title level={5}>Discount Codes</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={codes}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginTop: 28,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Product Discounts for Everyone
        </Typography.Title>
        <Input
          allowClear
          value={productDiscountSearch}
          onChange={(event) => setProductDiscountSearch(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Search discounted products..."
          style={{ width: 280 }}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={visibleDiscountedProducts}
        columns={productDiscountColumns}
        pagination={false}
        locale={{
          emptyText: productDiscountSearch.trim()
            ? "No discounted products match your search."
            : "No products are discounted for everyone.",
        }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={editing ? `Edit ${editing.code}` : "Generate Discount Code"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={save}
        okText={editing ? "Save" : "Generate"}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form layout="vertical" form={form}>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item
              name="discountType"
              label="Discount Type"
              rules={[{ required: true }]}
              style={{ width: 180 }}
            >
              <Select
                options={[
                  { label: "Percent off", value: "PERCENT" },
                  { label: "Fixed amount off", value: "FIXED" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="value"
              label={`Value (${discountType === "PERCENT" ? "%" : "US$"})`}
              rules={[{ required: true, message: "Enter a value" }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0.01}
                max={discountType === "PERCENT" ? 100 : 100000}
                prefix={discountType === "FIXED" ? "US$" : undefined}
                suffix={discountType === "PERCENT" ? "%" : undefined}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="appliesToAllProducts"
            label="Apply to all products"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {!appliesToAll ? (
            <Form.Item
              name="productIds"
              label="Specific Products"
              rules={[
                {
                  validator: (_, value) =>
                    value?.length
                      ? Promise.resolve()
                      : Promise.reject("Choose at least one product"),
                },
              ]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={productOptions}
                placeholder="Select products this code can discount"
              />
            </Form.Item>
          ) : null}

          <Form.Item
            name="expiresAt"
            label="Expiry"
            rules={[{ required: true, message: "Choose an expiry date" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="maxRedemptions"
            label="Max Uses (optional)"
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          {!editing ? (
            <Text type="secondary">
              The actual customer code will be generated by the backend when you
              click Generate.
            </Text>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={
          editingProductDiscount
            ? `Edit Discount: ${editingProductDiscount.name}`
            : "Discount a Product for Everyone"
        }
        open={productDiscountModalOpen}
        onCancel={() => {
          setProductDiscountModalOpen(false);
          setEditingProductDiscount(null);
        }}
        onOk={saveProductDiscount}
        okText="Save Discount"
        confirmLoading={productDiscountSaving}
        destroyOnHidden
      >
        <Form layout="vertical" form={productDiscountForm}>
          <Form.Item
            name="productId"
            label="Product"
            rules={[{ required: true, message: "Choose a product" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={productOptions}
              placeholder="Select a product"
              disabled={Boolean(editingProductDiscount)}
            />
          </Form.Item>

          <Form.Item
            name="discountPercent"
            label="Discount (%)"
            rules={[{ required: true, message: "Enter a discount" }]}
            extra="This discount is applied automatically for every customer."
          >
            <InputNumber
              min={0.01}
              max={100}
              step={0.5}
              suffix="%"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item name="discountStartsAt" label="Starts">
            <DatePicker showTime allowClear style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="discountExpiresAt"
            label="Expires"
            dependencies={["discountStartsAt"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startsAt = getFieldValue("discountStartsAt");
                  if (!startsAt || !value || dayjs(value).isAfter(dayjs(startsAt))) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Expiry must be after the start date"),
                  );
                },
              }),
            ]}
          >
            <DatePicker showTime allowClear style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
