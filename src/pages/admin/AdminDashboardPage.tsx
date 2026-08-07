// src/pages/admin/AdminDashboardPage.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, message } from "antd";
import { useNavigate, useSearchParams } from "../../lib/router";
import { api } from "../../api/client";

import AdminShell from "../../components/AdminShell";
import OrdersTab from "../../components/OrdersTab";
import ProductsTab from "../../components/ProductsTab";
import CategoriesTab from "../../components/CategoriesTab";
import WindowsTab from "../../components/WindowsTab";
import DropoffLocationsTab from "../../components/DropoffLocationsTab";
import DashboardTab from "../../components/DashboardTab";
import UsersTab from "../../components/UsersTab";
import CarcassWeightsTab from "../../components/CarcassWeightsTab";
import WasteManagementTab from "../../components/WasteManagementTab";
import ContentTab from "../../components/ContentTab";
import DiscountCodesTab from "../../components/DiscountCodesTab";

export type AdminCategory = {
  id: string;
  name: string;
  description?: string | null;
  key: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
};

export type AdminProductWaste = {
  id: string;
  qtyWasted: number;
  totalWeightG?: number | null;
  costValueLost: string | number;
  retailValueLost?: string | number;
  wholesaleValueLost?: string | number;
  notes?: string | null;
  createdAt: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  retailPrice: string | number;
  wholesalePrice: string | number;
  costPrice: string | number;
  discountPercent?: string | number;
  discountStartsAt?: string | null;
  discountExpiresAt?: string | null;
  stockQty: number;
  isActive: boolean;
  isForProcessing?: boolean;
  imageUrl?: string | null;
  sortOrder?: number | null;
  categoryId?: string | null;
  cutType?: string | null;
  avgWeightG?: number | null;
  category?: AdminCategory | null;
  _count?: {
    orderItems: number;
    wastes?: number;
  };
  wastes?: AdminProductWaste[];
  totalPacksWasted?: number;
  totalWeightWastedG?: number;
  totalWasteValue?: string | number;
  processingAvailableWeightKg?: string | number;
};

export type AdminDiscountCode = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: string | number;
  appliesToAllProducts: boolean;
  expiresAt: string;
  isActive: boolean;
  maxRedemptions?: number | null;
  redemptionCount: number;
  createdAt: string;
  products?: Array<{
    productId: string;
    product?: Pick<AdminProduct, "id" | "name" | "categoryId" | "isActive">;
  }>;
};

export type AdminOrderItem = {
  id: string;
  productId?: string;
  productName: string;
  unit: string;
  qty: string | number;
  unitPrice?: string | number;
  lineSubtotal?: string | number;
  discountTotal?: string | number;
  productDiscountPercent?: string | number;
  codeDiscountType?: string | null;
  codeDiscountValue?: string | number;
  codeDiscountApplies?: boolean;
  lineTotal?: string | number;
  weightKg?: string | number | null;
  packWeights?: Array<{ value: number; unit: "kg" | "g" }>;
  wetWeightKg?: string | number | null;
  dryWeightKg?: string | number | null;
  product?: {
    avgWeightG?: number | null;
    costPrice?: string | number | null;
  } | null;
};

export type AdminOrder = {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  businessName?: string | null;
  requestedDeliveryDate?: string | null;
  pricingTier: string;
  status: string;
  notes?: string | null;
  personalAddress?: string | null;
  packerInitials?: string | null;
  subtotal: number;
  discountTotal?: string | number;
  productDiscountTotal?: string | number;
  codeDiscountTotal?: string | number;
  discountCode?: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
  dropoffLocationId?: string | null;
  windowId?: string | null;
  deliveryScheduleId?: string | null;
  items: AdminOrderItem[];
  dropoffLocation?: any;
  deliverySchedule?: any;
  window?: any;
};

export type AdminWindow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isPermanent: boolean;
};

export type AdminPermission =
  | "admin.full"
  | "dashboard.view"
  | "orders.view"
  | "orders.status.update"
  | "orders.weights.update"
  | "orders.delete"
  | "packinglists.export"
  | "packinglists.pdf"
  | "products.view"
  | "products.manage"
  | "categories.view"
  | "categories.manage"
  | "windows.view"
  | "windows.manage"
  | "dropoffs.view"
  | "dropoffs.manage"
  | "users.view"
  | "users.manage"
  | "carcassweights.view"
  | "carcassweights.manage"
  | "content.view"
  | "content.manage";

export type CarcassWeightRecord = {
  id: string;
  animalId: string;
  weighedAt: string;
  wetWeightKg: string | number;
  dryWeightKg?: string | number | null;
  dryWeighedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  permissions: AdminPermission[];
  createdAt: string;
};

function hasPermission(
  permissions: AdminPermission[],
  needed: AdminPermission,
) {
  return permissions.includes("admin.full") || permissions.includes(needed);
}

function toNumber(v: string | number | null | undefined) {
  return Number(v ?? 0);
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [windows, setWindows] = useState<AdminWindow[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [discountCodes, setDiscountCodes] = useState<AdminDiscountCode[]>([]);
  const [report, setReport] = useState<any>(null);

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [carcassWeights, setCarcassWeights] = useState<CarcassWeightRecord[]>(
    [],
  );
  const [myPermissions, setMyPermissions] = useState<AdminPermission[]>([]);

  const [isAuthed, setIsAuthed] = useState(false);

  const ensureAuth = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/me");
      console.log("/api/admin/me ->", res.data);
      setIsAuthed(true);
      setMyPermissions(res.data?.user?.permissions || []);
      return true;
    } catch {
      setIsAuthed(false);
      setMyPermissions([]);
      navigate("/admin");
      return false;
    }
  }, [navigate]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await ensureAuth();
      if (!ok) return;

      const [pRes, oRes, wRes, cRes, uRes, cwRes, dRes] = await Promise.all([
        api.get("/api/admin/products"),
        api.get("/api/admin/orders"),
        api.get("/api/admin/windows"),
        api.get("/api/admin/categories"),
        api.get("/api/admin/users").catch(() => ({ data: { users: [] } })),
        api
          .get("/api/admin/carcass-weights")
          .catch(() => ({ data: { records: [] } })),
        api
          .get("/api/admin/discount-codes")
          .catch(() => ({ data: { codes: [] } })),
      ]);

      setProducts(pRes.data.products || []);
      setOrders(oRes.data.orders || []);
      setWindows(wRes.data.windows || []);
      setCategories(cRes.data.categories || []);
      setUsers(uRes.data.users || []);
      setCarcassWeights(cwRes.data.records || []);
      setDiscountCodes(dRes.data.codes || []);
    } catch (e: any) {
      message.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [ensureAuth]);

  const loadReport = useCallback(async (windowId?: string) => {
    try {
      const res = await api.get("/api/admin/reports/summary", {
        params: windowId ? { windowId } : {},
      });
      setReport(res.data);
    } catch {
      setReport(null);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadReport();
  }, [loadAll, loadReport]);

  const windowOptions = useMemo(
    () => windows.map((w) => ({ label: w.name, value: w.id })),
    [windows],
  );

  const totalWasteValue = useMemo(() => {
    return products.reduce((sum, p) => sum + toNumber(p.totalWasteValue), 0);
  }, [products]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/admin/auth/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("aca_admin_token");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");

      setIsAuthed(false);
      setMyPermissions([]);
      navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("aca_admin_auth", {
        detail: { isAuthed, logout },
      }),
    );
  }, [isAuthed, logout]);

  const canViewDashboard = hasPermission(myPermissions, "dashboard.view");
  const canViewOrders = hasPermission(myPermissions, "orders.view");
  const canViewCategories = hasPermission(myPermissions, "categories.view");
  const canViewProducts = hasPermission(myPermissions, "products.view");
  const canManageProducts = hasPermission(myPermissions, "products.manage");
  const canViewWaste = canViewProducts || canManageProducts;
  const canViewDropoffs = hasPermission(myPermissions, "dropoffs.view");
  const canViewWindows = hasPermission(myPermissions, "windows.view");
  const canViewUsers = hasPermission(myPermissions, "users.view");
  const canViewContent = hasPermission(myPermissions, "content.view");
  const canViewCarcassWeights = hasPermission(
    myPermissions,
    "carcassweights.view",
  );

  const defaultTabKey = canViewDashboard
    ? "dashboard"
    : canViewOrders
      ? "orders"
      : canViewProducts
        ? "products"
        : canViewWaste
          ? "waste"
          : canViewUsers
            ? "users"
            : canViewContent
              ? "content"
              : canViewCarcassWeights
                ? "carcass-weights"
                : "dashboard";

  // Persist the selected tab in the URL so a refresh keeps the user on the
  // same tab instead of resetting to the dashboard.
  const activeTabKey = searchParams.get("tab") || defaultTabKey;

  const handleTabChange = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <AdminShell>
      <Tabs
        activeKey={activeTabKey}
        onChange={handleTabChange}
        items={[
          ...(canViewDashboard
            ? [
              {
                key: "dashboard",
                label: "Dashboard",
                children: (
                  <DashboardTab
                    loading={loading}
                    orders={orders}
                    products={products}
                    windows={windows}
                    carcassWeights={carcassWeights}
                    totalWasteValue={totalWasteValue}
                  />
                ),
              },
            ]
            : []),

          ...(canViewOrders
            ? [
              {
                key: "orders",
                label: "Orders",
                children: (
                  <OrdersTab
                    loading={loading}
                    orders={orders}
                    windows={windows}
                    onReload={loadAll}
                    permissions={myPermissions}
                  />
                ),
              },
            ]
            : []),

          ...(canViewDropoffs
            ? [
              {
                key: "dropoffs",
                label: "Ordering Schedules",
                children: (
                  <DropoffLocationsTab loading={loading} onReload={loadAll} />
                ),
              },
            ]
            : []),

          ...(canViewCarcassWeights
            ? [
              {
                key: "carcass-weights",
                label: "Carcass Weights",
                children: (
                  <CarcassWeightsTab
                    loading={loading}
                    records={carcassWeights}
                    permissions={myPermissions}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),

          ...(canViewProducts
            ? [
              {
                key: "products",
                label: "Products",
                children: (
                  <ProductsTab
                    loading={loading}
                    products={products}
                    categories={categories}
                    onReload={loadAll}
                  />
                ),
              },
              {
                key: "discounts",
                label: "Discounts",
                children: (
                  <DiscountCodesTab
                    loading={loading}
                    products={products}
                    codes={discountCodes}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),

          ...(canViewCategories
            ? [
              {
                key: "categories",
                label: "Categories",
                children: (
                  <CategoriesTab
                    loading={loading}
                    categories={categories}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),

          ...(canViewUsers
            ? [
              {
                key: "users",
                label: "Users",
                children: (
                  <UsersTab
                    loading={loading}
                    users={users}
                    currentPermissions={myPermissions}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),

          ...(canViewContent
            ? [
              {
                key: "content",
                label: "Site Content",
                children: (
                  <ContentTab
                    permissions={myPermissions}
                  />
                ),
              },
            ]
            : []),

          ...(canViewWaste
            ? [
              {
                key: "waste",
                label: "Waste",
                children: (
                  <WasteManagementTab
                    loading={loading}
                    products={products}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),

          ...(canViewWindows
            ? [
              {
                key: "windows",
                label: "Active Ordering",
                children: (
                  <WindowsTab
                    loading={loading}
                    windows={windows}
                    onReload={loadAll}
                  />
                ),
              },
            ]
            : []),
        ]}
      />
    </AdminShell>
  );
}
