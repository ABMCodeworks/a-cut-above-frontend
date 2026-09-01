// src/App.tsx

import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "./lib/router";
import { Button, Layout, Space, message } from "antd";
import { CartProvider } from "./context/CartContext";
import { api } from "./api/client";

import TopBar from "./components/TopBar";
import AdminTopBar from "./components/AdminTopBar";

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

import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";

const { Content, Footer } = Layout;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    document.title = isAdminRoute
      ? "A Cut Above Meats Admin"
      : "A Cut Above Meats Shop";
  }, [isAdminRoute]);

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [checkingAdminAuth, setCheckingAdminAuth] = useState(false);

  const checkAdminAuth = useCallback(async () => {
    setCheckingAdminAuth(true);

    try {
      await api.get("/api/admin/me");
      setAdminAuthed(true);
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
      <Layout style={{ minHeight: "100vh" }}>
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

        <Content
          style={{
            padding: 24,
            maxWidth: 1280,
            margin: "0 auto",
            width: "100%",
          }}
        >
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
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Routes>
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
