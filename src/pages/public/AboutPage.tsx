// src/pages/public/AboutPage.tsx

import React, { useMemo, useState } from "react";
import { Card, Col, Grid, Modal, Row, Space, Typography } from "antd";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const ABOUT_IMAGES = [
  "/about/about-1.webp",
  "/about/about-2.webp",
  "/about/about-3.webp",
];

export default function AboutPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const heroImage = useMemo(
    () => (hiddenImages[ABOUT_IMAGES[0]] ? null : ABOUT_IMAGES[0]),
    [hiddenImages],
  );

  const storyImages = useMemo(
    () => ABOUT_IMAGES.slice(1).filter((src) => !hiddenImages[src]),
    [hiddenImages],
  );

  return (
    <div className="aca-page">
      <section className="aca-aboutHero">
        <div className="aca-aboutHero__frame">
          <div className="aca-aboutHero__copy">
            <Text className="aca-aboutHero__eyebrow">
              Family-run in Zimbabwe
            </Text>

            <Title level={1} className="aca-displayTitle">
              Honest meat, raised with care.
            </Title>

            <Paragraph className="aca-aboutHero__intro">
              A Cut Above began unexpectedly, with a debt repaid in cattle. Five
              years later it has grown into a thriving herd, a working farm, and
              a deep commitment to more transparent meat production.
            </Paragraph>

            <Space size={[8, 8]} wrap>
              {["Ethical sourcing", "Free-ranging animals", "Hormone-free"].map(
                (label) => (
                  <span className="aca-aboutPill" key={label}>
                    {label}
                  </span>
                ),
              )}
            </Space>
          </div>

          {heroImage ? (
            <button
              type="button"
              className="aca-aboutHero__image"
              onClick={() =>
                setPreviewImage({
                  src: heroImage,
                  alt: "A Cut Above farm image 1",
                })
              }
            >
              <img
                src={heroImage}
                alt="A Cut Above farm image 1"
                onError={() => {
                  setHiddenImages((prev) => ({
                    ...prev,
                    [heroImage]: true,
                  }));
                }}
              />
            </button>
          ) : null}
        </div>
      </section>

      <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
        <Col xs={24} lg={14}>
          <Card
            className="aca-sidebarCard aca-aboutStory"
            styles={{
              body: {
                padding: isMobile ? 16 : 28,
              },
            }}
          >
            <Title level={3} style={{ marginTop: 0 }}>
              Rooted in Better Farming
            </Title>

            <Paragraph>
              While we love great meat, we also believe the industry can be more
              balanced. For us, that means raising animals with care and
              respect, giving them a life that reflects the values we stand for.
            </Paragraph>

            <Paragraph style={{ marginBottom: 0 }}>
              We are on a journey to bring more ethical and transparent
              standards to meat production in Zimbabwe, offering produce that is
              responsibly raised and rooted in honesty, from our farm to your
              plate.
            </Paragraph>

            {storyImages.length ? (
              <div className="aca-aboutStory__images">
                {storyImages.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    className="aca-aboutStory__image"
                    onClick={() =>
                      setPreviewImage({
                        src,
                        alt: `A Cut Above farm image ${index + 2}`,
                      })
                    }
                  >
                    <img
                      src={src}
                      alt={`A Cut Above farm image ${index + 2}`}
                      onError={() => {
                        setHiddenImages((prev) => ({
                          ...prev,
                          [src]: true,
                        }));
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <div className="aca-aboutValues">
            {[
              {
                title: "Respect for animals",
                text: "Raised with care, space, and dignity.",
              },
              {
                title: "Honest farming",
                text: "Clear sourcing and practical transparency.",
              },
              {
                title: "Responsible production",
                text: "A better standard for local meat.",
              },
            ].map((item) => (
              <div key={item.title} className="aca-aboutValue">
                <div>{item.title}</div>
                <Text>{item.text}</Text>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        centered
        width={900}
        destroyOnHidden
        styles={{
          body: {
            padding: 0,
            background: "transparent",
          },
        }}
      >
        {previewImage ? (
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            style={{
              width: "100%",
              maxHeight: "82vh",
              objectFit: "contain",
              display: "block",
              borderRadius: 12,
              background: "#fff",
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
