import React, { useEffect, useState } from "react";
import { Button, Card, Space, Typography } from "antd";
import { Link } from "../lib/router";
import {
  getPrivacyPreferences,
  setPrivacyPreferences,
} from "../utils/privacyPreferences";

const { Text } = Typography;

export default function PrivacyPreferencesBanner() {
  const [visible, setVisible] = useState(() => !getPrivacyPreferences());

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener("aca_open_privacy_preferences", open);
    return () => window.removeEventListener("aca_open_privacy_preferences", open);
  }, []);

  function choose(preferences: boolean) {
    setPrivacyPreferences(preferences);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy preferences"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 2000,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Card
        className="aca-card"
        style={{ width: "min(760px, 100%)", boxShadow: "0 16px 48px rgba(0,0,0,.22)" }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Text strong style={{ fontSize: 17 }}>Your privacy choices</Text>
          <Text>
            We use essential browser storage for your cart, checkout and secure
            access. With your permission, we also remember display and delivery
            location preferences. We do not currently use advertising or analytics
            cookies. Read our <Link to="/cookie-policy">cookie notice</Link>.
          </Text>
          <Space wrap>
            <Button type="primary" onClick={() => choose(true)}>
              Allow preferences
            </Button>
            <Button onClick={() => choose(false)}>Necessary only</Button>
            <Button type="link" onClick={() => setVisible(false)}>
              Decide later
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
