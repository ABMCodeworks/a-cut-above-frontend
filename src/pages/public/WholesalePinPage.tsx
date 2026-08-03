import React, { useMemo, useState } from "react";
import { useNavigate } from "../../lib/router";
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Space,
  Typography,
  message,
} from "antd";
import { api } from "../../api/client";

const { Title, Text } = Typography;

export default function WholesalePinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);

  const isWholesale = useMemo(
    () => Boolean(localStorage.getItem("aca_wholesale_pin")),
    [],
  );

  async function enterWholesale() {
    const cleaned = pin.trim();
    if (!cleaned) {
      message.warning("Please enter a PIN.");
      return;
    }

    setChecking(true);
    localStorage.setItem("aca_wholesale_pin", cleaned);

    try {
      const res = await api.get("/api/public/products");
      if (String(res.data?.pricingTier || "").toUpperCase() !== "WHOLESALE") {
        localStorage.removeItem("aca_wholesale_pin");
        message.error("That wholesale PIN is not valid.");
        return;
      }

      message.success("Wholesale access confirmed.");
      navigate("/products", { replace: true });
      window.location.reload();
    } catch {
      localStorage.removeItem("aca_wholesale_pin");
      message.error("Wholesale access could not be verified. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <Card style={{ width: "100%", maxWidth: 520 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={3} style={{ marginBottom: 6 }}>
              Wholesale Partner Access
            </Title>
            <Text type="secondary">
              Approved business customers can sign in to view wholesale
              pricing and place an order for any delivery area.
            </Text>
          </div>

          <Input.Password
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Wholesale PIN"
            autoFocus
            onPressEnter={enterWholesale}
          />

          <Button
            type="primary"
            block
            loading={checking}
            onClick={enterWholesale}
          >
            Enter Wholesale
          </Button>

          {isWholesale ? (
            <Button
              danger
              block
              onClick={() => {
                localStorage.removeItem("aca_wholesale_pin");
                message.info("Exited wholesale mode.");
                navigate("/products", { replace: true });
                window.location.reload();
              }}
            >
              Exit Wholesale
            </Button>
          ) : (
            <Button block onClick={() => navigate("/products")}>
              Back to Shop
            </Button>
          )}

          <Divider style={{ margin: "8px 0" }} />

          <Alert
            type="info"
            showIcon
            message="Would you like to stock our products?"
            description="Contact A Cut Above to apply for wholesale access and discuss your business requirements."
          />

          <Button block onClick={() => navigate("/contact")}>
            Contact us about wholesale
          </Button>
        </Space>
      </Card>
    </div>
  );
}
