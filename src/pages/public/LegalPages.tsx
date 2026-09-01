import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { Link } from "../../lib/router";
import { api } from "../../api/client";
import {
  canStorePreferences,
  setPrivacyPreferences,
} from "../../utils/privacyPreferences";

const { Title, Text, Paragraph } = Typography;
const PRIVACY_EMAIL = "karina.kozlowska.zim@gmail.com";
const PRIVACY_WHATSAPP = "+263 78 220 6618";
const NOTICE_DATE = "1 September 2026";

function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="aca-page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="aca-page__top">
        <div>
          <Title level={2} className="aca-displayTitle" style={{ marginBottom: 4 }}>
            {title}
          </Title>
          <Text className="aca-subtitle">{intro}</Text>
        </div>
      </div>
      <Card className="aca-card" style={{ marginTop: 18 }}>
        {children}
        <Divider />
        <Text type="secondary">Last updated: {NOTICE_DATE}</Text>
      </Card>
    </div>
  );
}

function PrivacyContact() {
  return (
    <Paragraph>
      Privacy contact: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      {" · "}
      <a href="https://wa.me/263782206618" target="_blank" rel="noreferrer">
        {PRIVACY_WHATSAPP}
      </a>
    </Paragraph>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      intro="How A Cut Above collects, uses, shares and protects personal information."
    >
      <Title level={3}>Who controls your information</Title>
      <Paragraph>
        A Cut Above is the data controller for this shop and its order records. We
        operate from Mutare, Zimbabwe. Our full service address may be requested using
        the contact details below.
      </Paragraph>
      <PrivacyContact />

      <Title level={3}>Information we collect</Title>
      <Paragraph>
        We collect the details you provide when ordering or contacting us, including
        your name, phone number, optional email, business name, delivery location or
        address, requested delivery date, order notes and order contents. We also keep
        order status, payment/price records, consent records and communications needed
        to serve you. Basic technical logs may include an IP address, browser details,
        timestamps and security events.
      </Paragraph>

      <Title level={3}>Why we use it</Title>
      <Paragraph>
        We use personal information to take, fulfil, deliver and support orders; verify
        stock and discounts; provide order tracking; prevent misuse; keep accounting
        and legal records; handle complaints and data-rights requests; and protect the
        shop. These activities are necessary for your order, compliance with law, or
        our legitimate business and security interests. Optional WhatsApp updates are
        sent only when you opt in and may be withdrawn at any time.
      </Paragraph>
      <Paragraph>
        Checkout fields marked as required are needed to identify, prepare and deliver
        your order; without them we cannot accept the order. Email, delivery notes and
        WhatsApp updates are optional except where a particular wholesale or delivery
        arrangement expressly requires the relevant detail. We do not currently send
        direct-marketing campaigns. Any future marketing will have a separate choice
        and a free opt-out.
      </Paragraph>

      <Title level={3}>Who receives it</Title>
      <Paragraph>
        Access is limited to authorised A Cut Above staff and service providers that
        help host the shop, store records, deliver orders or send communications. If
        you opt in to WhatsApp updates, your name, phone number and order status may be
        processed by Twilio and WhatsApp/Meta. We may also disclose information to
        professional advisers or public authorities where legally required. We do not
        sell personal information.
      </Paragraph>

      <Title level={3}>International processing</Title>
      <Paragraph>
        Some hosting and communications providers may process information outside
        Zimbabwe. We limit what is shared, use appropriate contractual and security
        measures, and make any notifications or obtain approvals required for a
        cross-border transfer.
      </Paragraph>

      <Title level={3}>Retention and security</Title>
      <Paragraph>
        We retain order and transaction records only while needed to fulfil orders,
        resolve disputes and meet tax, accounting, consumer-protection and other legal
        duties. Other information is deleted or anonymised when no longer necessary.
        We use access controls, authenticated administration, encrypted transport,
        backups and service-provider controls appropriate to the information handled.
        No internet service can promise absolute security. If a personal-data security
        incident occurs, we will investigate, contain it and notify POTRAZ and affected
        people where the law requires.
      </Paragraph>

      <Title level={3}>Your rights</Title>
      <Paragraph>
        You may ask to be informed about processing, access your information, correct
        inaccurate information, object to processing, request deletion where the law
        permits, or withdraw consent without charge. Withdrawing consent does not undo
        processing that was lawful before withdrawal and does not prevent processing
        required to complete an order or comply with law.
      </Paragraph>
      <Paragraph>
        Use our <Link to="/privacy-rights">Privacy Choices & Data Rights</Link> page
        to submit and track a request. We may need to verify your identity before
        disclosing or changing order information. You may also complain to Zimbabwe's
        Data Protection Authority, POTRAZ, at{" "}
        <a href="https://www.potraz.gov.zw" target="_blank" rel="noreferrer">
          potraz.gov.zw
        </a>
        , by email at{" "}
        <a href="mailto:the.regulator@potraz.gov.zw">the.regulator@potraz.gov.zw</a>,
        or by phone on +263 242 333032.
      </Paragraph>

      <Title level={3}>Children and changes</Title>
      <Paragraph>
        This ordering service is intended for adults. A person under 18 should use it
        only with a parent or legal guardian. We may update this notice when our
        services or legal duties change; the date and current version will remain on
        this page.
      </Paragraph>

      <Title level={3}>Zimbabwe legal references</Title>
      <Paragraph>
        This notice is designed around the{" "}
        <a href="https://zimlii.org/akn/zw/act/2021/5" target="_blank" rel="noreferrer">
          Cyber and Data Protection Act, 2021
        </a>
        , the{" "}
        <a
          href="https://www.potraz.gov.zw/wp-content/uploads/2025/02/sI-155-of-2024-Cyber-and-Data-Protection-Normal_240913_1250178.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Cyber and Data Protection (Licensing of Data Controllers and Appointment of Data Protection Officers) Regulations, 2024
        </a>
        , and the{" "}
        <a href="https://zimlii.org/akn/zw/act/2019/5/eng@2019-12-10" target="_blank" rel="noreferrer">
          Consumer Protection Act, 2019
        </a>.
      </Paragraph>
    </LegalPage>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie & Browser Storage Notice"
      intro="What this shop stores in your browser and how to control it."
    >
      <Title level={3}>Essential storage</Title>
      <Paragraph>
        The shop stores your cart and wholesale session in your browser so requested
        features work. The admin area uses a secure authentication cookie. These are
        necessary for the service and are not used for advertising.
      </Paragraph>

      <Title level={3}>Optional preferences</Title>
      <Paragraph>
        If you choose “Allow preferences”, we may remember your display theme and most
        recently selected delivery location. These values stay in your browser until
        you clear them or withdraw the choice. We do not currently use analytics,
        advertising or cross-site tracking cookies.
      </Paragraph>

      <Title level={3}>Change or withdraw your choice</Title>
      <Paragraph>
        You can switch to necessary-only storage at any time on the{" "}
        <Link to="/privacy-rights">Privacy Choices & Data Rights</Link> page. This
        clears optional preference values from this browser. Your browser settings can
        also delete all local data, but doing so may empty the cart or end a session.
      </Paragraph>
      <PrivacyContact />
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Shop Terms"
      intro="The terms that apply when you place an A Cut Above order."
    >
      <Title level={3}>Orders and availability</Title>
      <Paragraph>
        An order is a request to buy the listed products. Acceptance remains subject
        to stock, delivery availability and any wholesale verification. We may contact
        you to clarify or adjust an order and will explain if an item cannot be supplied.
      </Paragraph>

      <Title level={3}>Weights and prices</Title>
      <Paragraph>
        Meat sold by weight may show an estimate at checkout. The final amount is based
        on the actual packed weight at the displayed price per kilogram. Pack products
        are charged by pack unless stated otherwise. Applicable discounts are shown in
        the order record.
      </Paragraph>

      <Title level={3}>Delivery and customer details</Title>
      <Paragraph>
        You must provide accurate contact and delivery information and be available to
        receive the order at the agreed place and time. Delivery dates may change for
        operational, weather, stock or safety reasons; we will communicate material
        changes using the contact method you supplied.
      </Paragraph>

      <Title level={3}>Changes, cancellation and product concerns</Title>
      <Paragraph>
        Contact us promptly if you need to change or cancel an order. Because meat is
        perishable, a cancellation or return may not be possible once packing or
        delivery has started. If goods are incorrect, damaged or not of acceptable
        quality, contact us as soon as reasonably possible with the order number and
        details. Nothing in these terms removes rights that cannot lawfully be excluded
        under Zimbabwean consumer law.
      </Paragraph>

      <Title level={3}>Privacy and communications</Title>
      <Paragraph>
        Our <Link to="/privacy">Privacy Notice</Link> explains how order information is
        used. WhatsApp order updates are optional and depend on your separate checkout
        choice. You can withdraw that choice on the{" "}
        <Link to="/privacy-rights">Privacy Choices & Data Rights</Link> page.
      </Paragraph>
      <PrivacyContact />
    </LegalPage>
  );
}

type RightsForm = {
  requestType: string;
  name: string;
  contact: string;
  orderNo?: string;
  details?: string;
};

export function PrivacyRightsPage() {
  const [form] = Form.useForm<RightsForm>();
  const [submitting, setSubmitting] = useState(false);
  const [preferencesEnabled, setPreferencesEnabled] = useState(() =>
    canStorePreferences(),
  );
  const requestType = Form.useWatch("requestType", form);

  function updatePreferences(enabled: boolean) {
    setPrivacyPreferences(enabled);
    setPreferencesEnabled(enabled);
    message.success(
      enabled
        ? "Optional preferences are enabled on this browser."
        : "Optional preferences were withdrawn and cleared from this browser.",
    );
  }

  async function submitRequest(values: RightsForm) {
    setSubmitting(true);
    try {
      const res = await api.post("/api/public/privacy-requests", values);
      message.success(`Request received. Reference: ${res.data.requestNo}`);
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LegalPage
      title="Privacy Choices & Data Rights"
      intro="Withdraw optional consent, change browser preferences, or submit a data request."
    >
      <Title level={3}>Browser preferences</Title>
      <Paragraph>
        Current choice: <b>{preferencesEnabled ? "preferences allowed" : "necessary only"}</b>.
        Your cart and secure sessions remain available because they are necessary.
      </Paragraph>
      <Space wrap>
        <Button type={preferencesEnabled ? "default" : "primary"} onClick={() => updatePreferences(false)}>
          Use necessary only
        </Button>
        <Button type={preferencesEnabled ? "primary" : "default"} onClick={() => updatePreferences(true)}>
          Allow preferences
        </Button>
      </Space>

      <Divider />
      <Title level={3}>Submit a privacy request</Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 18 }}
        message="WhatsApp withdrawal is applied immediately when the order number and contact details match. Other requests are reviewed after identity verification."
      />
      <Form form={form} layout="vertical" onFinish={submitRequest}>
        <Form.Item
          name="requestType"
          label="Request type"
          rules={[{ required: true, message: "Choose a request type" }]}
        >
          <Select
            options={[
              { value: "WITHDRAW_WHATSAPP", label: "Withdraw WhatsApp consent" },
              { value: "ACCESS", label: "Access my personal information" },
              { value: "CORRECT", label: "Correct my information" },
              { value: "DELETE", label: "Delete information where permitted" },
              { value: "OBJECT", label: "Object to processing" },
              { value: "QUESTION_OR_COMPLAINT", label: "Privacy question or complaint" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="Full name"
          rules={[{ required: true, min: 2, message: "Enter your full name" }]}
        >
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item
          name="contact"
          label="Phone number or email used for the order"
          rules={[{ required: true, min: 5, message: "Enter your phone number or email" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="orderNo"
          label="Order number"
          extra="Required to withdraw WhatsApp consent immediately."
          rules={requestType === "WITHDRAW_WHATSAPP" ? [{ required: true, message: "Enter the order number" }] : []}
        >
          <Input placeholder="ACA-YYYYMMDD-0000" />
        </Form.Item>
        <Form.Item
          name="details"
          label="Details"
          rules={[{ max: 2000, message: "Keep details under 2,000 characters" }]}
        >
          <Input.TextArea rows={4} placeholder="Tell us what information or action you need." />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Submit request
        </Button>
      </Form>
      <Divider />
      <Paragraph>
        You can also contact us directly. Please do not send identity documents until
        we ask for a secure verification method.
      </Paragraph>
      <PrivacyContact />
    </LegalPage>
  );
}
