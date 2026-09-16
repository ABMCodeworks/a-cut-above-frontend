// src/App.tsx

import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "./lib/router";
import { Button, Layout, Space, Spin, message } from "antd";
import { CartProvider } from "./context/CartContext";
import { api } from "./api/client";

import TopBar from "./components/TopBar";
import Seo from "./components/Seo";
import RequireAdmin from "./components/RequireAdmin";

import ShopPage from "./pages/public/ShopPage";
import AboutPage from "./pages/public/AboutPage";
import ContactPage from "./pages/public/ContactPage";
import CheckoutPage from "./pages/public/CheckoutPage";
import TrackOrderPage from "./pages/public/TrackOrderPage";
import WholesalePinPage from "./pages/public/WholesalePinPage";
import {
  CookiePolicyPage,
  PrivacyPolicyPage,
  PrivacyRightsPage,
  TermsPage,
} from "./pages/public/LegalPages";
import PrivacyPreferencesBanner from "./components/PrivacyPreferencesBanner";

const AdminTopBar = lazy(() => import("./components/AdminTopBar"));
const AdminSetupPage = lazy(() => import("./pages/admin/AdminSetupPage"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));

const { Content, Footer } = Layout;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [checkingAdminAuth, setCheckingAdminAuth] = useState(true);

  const checkAdminAuth = useCallback(async () => {
    setCheckingAdminAuth(true);

    try {
      const { data } = await api.get("/api/admin/me");
      setAdminAuthed(data?.ok === true && Boolean(data?.user?.id));
    } catch {
      setAdminAuthed(false);
    } finally {
      setCheckingAdminAuth(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      checkAdminAuth();
    }
  }, [isAdminRoute, location.pathname, checkAdminAuth]);

  const refreshAdmin = useCallback(() => {
    checkAdminAuth();
    navigate(0);
  }, [checkAdminAuth, navigate]);

  const logoutAdmin = useCallback(async () => {
    try {
      await api.post("/api/admin/auth/logout");
    } catch {
      // ignore network/logout errors
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("aca_admin_token");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");

      setAdminAuthed(false);
      message.success("Logged out");
      navigate("/admin");
    }
  }, [navigate]);

  return (
    <CartProvider>
      <Seo />
      <Layout style={{ minHeight: "100vh" }}>
        <Suspense fallback={<Spin aria-label="Loading staff navigation" />}>
        {isAdminRoute ? (
          <AdminTopBar
            onRefresh={refreshAdmin}
            isAuthed={adminAuthed}
            onLogout={logoutAdmin}
            onBrandClick={() => navigate("/admin/dashboard")}
            refreshLoading={checkingAdminAuth}
          />
        ) : (
          <TopBar />
        )}
        </Suspense>

        <Content
          style={{
            padding: 24,
            maxWidth: isAdminRoute ? 1800 : 1280,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <Suspense fallback={<Spin aria-label="Loading page" />}>
          <Routes>
            <Route path="/" element={<ShopPage />} />
            <Route path="/about" element={<AboutPage />} />

            <Route path="/products" element={<ShopPage />} />
            <Route path="/shop" element={<ShopPage />} />

            <Route path="/contact" element={<ContactPage />} />

            <Route path="/wholesale" element={<WholesalePinPage />} />

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy-rights" element={<PrivacyRightsPage />} />

            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/setup" element={<AdminSetupPage initial />} />
            <Route path="/admin/register" element={<AdminSetupPage />} />
            <Route path="/admin/dashboard" element={
              <RequireAdmin><AdminDashboardPage /></RequireAdmin>
            } />
            <Route path="*" element={
              <section className="aca-page">
                <h1>Page not found</h1>
                <p>This page is unavailable. <Link to="/">Return to the shop</Link> or <Link to="/contact">contact us</Link>.</p>
              </section>
            } />
          </Routes>
          </Suspense>
        </Content>

        <Footer style={{ textAlign: "center" }}>
          <Space wrap split={<span aria-hidden="true">·</span>} style={{ justifyContent: "center" }}>
            <span>A Cut Above © {new Date().getFullYear()}</span>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookie-policy">Cookies</Link>
            <Link to="/terms">Shop Terms</Link>
            <Link to="/privacy-rights">Privacy choices & data rights</Link>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => window.dispatchEvent(new Event("aca_open_privacy_preferences"))}
            >
              Manage preferences
            </Button>
          </Space>
        </Footer>
        {!isAdminRoute ? <PrivacyPreferencesBanner /> : null}
      </Layout>
    </CartProvider>
  );
}
