// src/pages/public/AboutPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Card, Col, Grid, Modal, Row, Space, Typography } from "antd";
import { api, RAILWAY_BASE } from "../../api/client";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

type AboutImage = {
  url: string;
  alt: string;
};

type AboutStory = {
  title: string;
  paragraphs: string[];
  images: AboutImage[];
};

type AboutContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroIntro: string;
  pills: string[];
  heroImage: AboutImage;
  stories: AboutStory[];
  values: Array<{ title: string; text: string }>;
};

const DEFAULT_ABOUT_CONTENT: AboutContent = {
  heroEyebrow: "Family-run in Zimbabwe",
  heroTitle: "Honest meat, raised with care.",
  heroIntro:
    "A Cut Above began unexpectedly, with a debt repaid in cattle. Five years later it has grown into a thriving herd, a working farm, and a deep commitment to more transparent meat production.",
  pills: ["Ethical sourcing", "Free-ranging animals", "Hormone-free"],
  heroImage: { url: "/about/about-1.webp", alt: "A Cut Above farm image 1" },
  stories: [
    {
      title: "Rooted in Better Farming",
      paragraphs: [
        "While we love great meat, we also believe the industry can be more balanced. For us, that means raising animals with care and respect, giving them a life that reflects the values we stand for.",
        "We are on a journey to bring more ethical and transparent standards to meat production in Zimbabwe, offering produce that is responsibly raised and rooted in honesty, from our farm to your plate.",
      ],
      images: [
        { url: "/about/about-2.webp", alt: "A Cut Above farm image 2" },
        { url: "/about/about-3.webp", alt: "A Cut Above farm image 3" },
      ],
    },
  ],
  values: [
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
  ],
};

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${RAILWAY_BASE}${url}`;
  return url;
}

export default function AboutPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;

    api
      .get("/api/public/site-content/about")
      .then((res) => {
        if (alive && res.data?.content) {
          setContent(res.data.content);
        }
      })
      .catch(() => {
        if (alive) setContent(DEFAULT_ABOUT_CONTENT);
      });

    return () => {
      alive = false;
    };
  }, []);

  const heroImage = useMemo(
    () => {
      const src = resolveImageUrl(content.heroImage?.url);
      if (!src || hiddenImages[src]) return null;
      return { ...content.heroImage, src };
    },
    [content.heroImage, hiddenImages],
  );

  return (
    <div className="aca-page">
      <section className="aca-aboutHero">
        <div className="aca-aboutHero__frame">
          <div className="aca-aboutHero__copy">
            <Text className="aca-aboutHero__eyebrow">
              {content.heroEyebrow}
            </Text>

            <Title level={1} className="aca-displayTitle">
              {content.heroTitle}
            </Title>

            <Paragraph className="aca-aboutHero__intro">
              {content.heroIntro}
            </Paragraph>

            <Space size={[8, 8]} wrap>
              {content.pills.map((label) => (
                <span className="aca-aboutPill" key={label}>
                  {label}
                </span>
              ))}
            </Space>
          </div>

          {heroImage ? (
            <button
              type="button"
              className="aca-aboutHero__image"
              onClick={() =>
                setPreviewImage({
                  src: heroImage.src,
                  alt: heroImage.alt,
                })
              }
            >
              <img
                src={heroImage.src}
                alt={heroImage.alt}
                onError={() => {
                  setHiddenImages((prev) => ({
                    ...prev,
                    [heroImage.src]: true,
                  }));
                }}
              />
            </button>
          ) : null}
        </div>
      </section>

      <Row gutter={[18, 18]} style={{ marginTop: 18 }}>
        <Col xs={24} lg={14}>
          <div className="aca-aboutStories">
            {content.stories.map((story, storyIndex) => {
              const storyImages = (story.images || [])
                .map((image) => ({ ...image, src: resolveImageUrl(image.url) }))
                .filter((image): image is AboutImage & { src: string } =>
                  Boolean(image.src && !hiddenImages[image.src]),
                );

              return (
              <Card
                key={`${story.title}-${storyIndex}`}
                className="aca-sidebarCard aca-aboutStory"
                styles={{
                  body: {
                    padding: isMobile ? 16 : 28,
                  },
                }}
              >
                <Title level={3} style={{ marginTop: 0 }}>
                  {story.title}
                </Title>

                {story.paragraphs.map((paragraph, paragraphIndex) => (
                  <Paragraph
                    key={`${paragraph}-${paragraphIndex}`}
                    style={{
                      marginBottom:
                        paragraphIndex === story.paragraphs.length - 1
                          ? 0
                          : undefined,
                    }}
                  >
                    {paragraph}
                  </Paragraph>
                ))}

                {storyImages.length ? (
                  <div className="aca-aboutStory__images">
                    {storyImages.map((image) => (
                      <button
                        key={image.src}
                        type="button"
                        className="aca-aboutStory__image"
                        onClick={() =>
                          setPreviewImage({
                            src: image.src,
                            alt: image.alt,
                          })
                        }
                      >
                        <img
                          src={image.src}
                          alt={image.alt}
                          onError={() => {
                            setHiddenImages((prev) => ({
                              ...prev,
                              [image.src]: true,
                            }));
                          }}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </Card>
              );
            })}
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div className="aca-aboutValues">
            {content.values.map((item) => (
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
