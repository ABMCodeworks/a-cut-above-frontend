import React, { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Spin, message } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "../../lib/router";
import { api } from "../../api/client";
import logo from "../../assets/logo.webp";

type LoginForm = { email: string; password: string };

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [setupAvailable, setSetupAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/api/admin/auth/setup-status")
      .then(({ data }) => { if (active) setSetupAvailable(data.available); })
      .catch(() => {});
    (async () => {
      try {
        await api.get("/api/admin/me");
        if (active) navigate("/admin/dashboard");
      } catch {
        // An unauthenticated visitor can sign in below.
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  async function login(values: LoginForm) {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/admin/auth/login", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      await api.get("/api/admin/me");
      message.success("Logged in");
      navigate("/admin/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.error || "We couldn’t sign you in. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="aca-login">
      <div className="aca-login__navigation">
        <Link to="/"><ArrowLeftOutlined aria-hidden="true" /> Back to the shop</Link>
        <span><LockOutlined aria-hidden="true" /> Team access</span>
      </div>
      <div className="aca-login__card">
        <section className="aca-login__brand" aria-label="A Cut Above Meats">
          <div className="aca-login__wordmark">A CUT ABOVE <span>MEATS</span></div>
          <img className="aca-login__logo" src={logo} alt="A Cut Above cattle emblem" />
          <div className="aca-login__brand-copy">
            <p className="aca-login__eyebrow">THE ADMIN WORKSPACE</p>
            <h2>A cut above.<br />Every day.</h2>
            <p>Your orders, your products, your team.<br />All in one place.</p>
          </div>
        </section>
        <section className="aca-login__panel" aria-labelledby="login-heading" aria-busy={checking}>
          <div className="aca-login__heading">
            <span className="aca-login__icon"><LockOutlined aria-hidden="true" /></span>
            <p className="aca-login__eyebrow">ADMIN LOGIN</p>
            <h1 id="login-heading">Welcome back.</h1>
            <p>Sign in to your A Cut Above workspace.</p>
          </div>
          {checking ? <div className="aca-login__checking" role="status"><Spin /><span>Checking your session…</span></div> :
            <Form layout="vertical" onFinish={login} requiredMark={false} size="large" className="aca-login__form" disabled={submitting}>
              {error && <Alert className="aca-login__error" type="error" showIcon title={error} role="alert" />}
              <Form.Item name="email" label="Email address" rules={[{ required: true, message: "Enter your email address" }, { type: "email", message: "Enter a valid email address" }]}>
                <Input prefix={<MailOutlined aria-hidden="true" />} placeholder="you@example.com" autoComplete="username" type="email" autoCapitalize="none" spellCheck={false} />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password" }]}>
                <Input.Password prefix={<LockOutlined aria-hidden="true" />} placeholder="Enter your password" autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting} className="aca-login__submit">
                Sign in <ArrowRightOutlined aria-hidden="true" />
              </Button>
            </Form>}
          <div className="aca-login__help">
            {setupAvailable ? <><strong>Setting up for the first time?</strong><Link to="/admin/setup">Create your first admin account <ArrowRightOutlined aria-hidden="true" /></Link></> :
              <><strong>Need access?</strong><p>Ask your administrator for an invitation link and access code.</p></>}
          </div>
        </section>
      </div>
      <p className="aca-login__footnote">A Cut Above Meats <span aria-hidden="true">·</span> Made for the team behind the quality.</p>
    </main>
  );
}
