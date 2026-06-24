import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  Popconfirm,
  Row,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadProps } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";

import { api, RAILWAY_BASE } from "../api/client";
import type { AdminPermission } from "../pages/admin/AdminDashboardPage";

const { Text, Title, Paragraph } = Typography;

type AboutImage = {
  url: string;
  alt: string;
};

type AboutValue = {
  title: string;
  text: string;
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
  acknowledgementTitle: string;
  acknowledgementText: string;
  values: AboutValue[];
};

function hasPermission(
  permissions: AdminPermission[],
  needed: AdminPermission,
) {
  return permissions.includes("admin.full") || permissions.includes(needed);
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${RAILWAY_BASE}${url}`;
  return url;
}

function normalizeFormContent(values: AboutContent): AboutContent {
  return {
    ...values,
    pills: (values.pills || []).map((v) => v.trim()).filter(Boolean),
    stories: (values.stories || [])
      .map((story) => ({
        title: story.title?.trim() || "",
        paragraphs: (story.paragraphs || [])
          .map((paragraph) => paragraph.trim())
          .filter(Boolean),
        images: (story.images || []).filter((image) => image?.url?.trim()),
      }))
      .filter((story) => story.title && story.paragraphs.length),
    values: (values.values || []).filter(
      (v) => v?.title?.trim() && v?.text?.trim(),
    ),
  };
}

export default function ContentTab({
  permissions,
}: {
  permissions: AdminPermission[];
}) {
  const [form] = Form.useForm<AboutContent>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<AboutContent | null>(null);

  const canManage = hasPermission(permissions, "content.manage");

  async function loadContent() {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/site-content/about");
      const next = res.data?.content as AboutContent;
      setContent(next);
      form.setFieldsValue(next);
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to load About page");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, []);

  async function saveContent() {
    const values = await form.validateFields();
    const payload = normalizeFormContent(values);

    try {
      setSaving(true);
      const res = await api.put("/api/admin/site-content/about", payload);
      const next = res.data?.content as AboutContent;
      setContent(next);
      form.setFieldsValue(next);
      message.success("About page updated");
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function heroUploadProps(): UploadProps {
    return {
      accept: "image/*",
      showUploadList: false,
      disabled: !canManage,
      beforeUpload: async (file) => {
        const fd = new FormData();
        fd.append("image", file);

        try {
          setSaving(true);
          const res = await api.post(
            "/api/admin/site-content/about/hero-image",
            fd,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          const next = res.data?.content as AboutContent;
          const current = form.getFieldsValue(true) as AboutContent;
          setContent({ ...current, heroImage: next.heroImage });
          form.setFieldsValue({ heroImage: next.heroImage });
          message.success("Image updated");
        } catch (e: any) {
          message.error(e?.response?.data?.error || "Upload failed");
        } finally {
          setSaving(false);
        }

        return Upload.LIST_IGNORE;
      },
    };
  }

  function storyImageUploadProps(
    storyIndex: number,
    imageIndex: number,
  ): UploadProps {
    return {
      accept: "image/*",
      showUploadList: false,
      disabled: !canManage,
      beforeUpload: async (file) => {
        const fd = new FormData();
        fd.append("image", file);

        try {
          setSaving(true);
          const res = await api.post(
            `/api/admin/site-content/about/stories/${storyIndex}/images/${imageIndex}`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          const next = res.data?.content as AboutContent;
          const current = form.getFieldsValue(true) as AboutContent;
          setContent({ ...current, stories: next.stories });
          form.setFieldsValue({ stories: next.stories });
          message.success("Image updated");
        } catch (e: any) {
          message.error(e?.response?.data?.error || "Upload failed");
        } finally {
          setSaving(false);
        }

        return Upload.LIST_IGNORE;
      },
    };
  }

  async function removeStoryImage(storyIndex: number, imageIndex: number) {
    try {
      setSaving(true);
      const res = await api.delete(
        `/api/admin/site-content/about/stories/${storyIndex}/images/${imageIndex}`,
      );
      const next = res.data?.content as AboutContent;
      const current = form.getFieldsValue(true) as AboutContent;
      setContent({ ...current, stories: next.stories });
      form.setFieldsValue({ stories: next.stories });
      message.success("Image removed");
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Remove failed");
    } finally {
      setSaving(false);
    }
  }

  const heroImage = Form.useWatch("heroImage", form) || content?.heroImage;
  const stories = Form.useWatch("stories", form) || content?.stories || [];

  return (
    <Card
      title="About Page"
      loading={loading}
      extra={
        canManage ? (
          <Button type="primary" loading={saving} onClick={saveContent}>
            Save Changes
          </Button>
        ) : null
      }
    >
      <Form layout="vertical" form={form} disabled={!canManage}>
        <section className="aca-aboutHero" style={{ marginBottom: 18 }}>
          <div className="aca-aboutHero__frame">
            <div className="aca-aboutHero__copy">
              <Form.Item
                name="heroEyebrow"
                label="Hero eyebrow"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="heroTitle"
                label="Hero title"
                rules={[{ required: true }]}
              >
                <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
              </Form.Item>

              <Form.Item
                name="heroIntro"
                label="Hero intro"
                rules={[{ required: true }]}
              >
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>

              <Form.List name="pills">
                {(fields, { add, remove }) => (
                  <div style={{ display: "grid", gap: 10 }}>
                    <Text strong>Hero pills</Text>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline">
                          <Form.Item
                            {...field}
                            rules={[
                              { required: true, message: "Enter pill text" },
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="e.g. Ethical sourcing" />
                          </Form.Item>
                          {canManage && fields.length > 1 ? (
                            <Button onClick={() => remove(field.name)}>
                              Remove
                            </Button>
                          ) : null}
                        </Space>
                      ))}
                      {canManage ? (
                        <Button onClick={() => add("")}>Add Pill</Button>
                      ) : null}
                    </Space>
                  </div>
                )}
              </Form.List>
            </div>

            <Card size="small" title="Hero image">
              {heroImage && resolveImageUrl(heroImage.url) ? (
                <Image
                  src={resolveImageUrl(heroImage.url) || undefined}
                  alt={heroImage.alt}
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              ) : null}

              <Form.Item
                name={["heroImage", "url"]}
                hidden
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name={["heroImage", "alt"]}
                label="Alt text"
                rules={[{ required: true }]}
                style={{ marginTop: 12 }}
              >
                <Input />
              </Form.Item>

              <Upload {...heroUploadProps()}>
                <Button icon={<UploadOutlined />}>Replace Hero Image</Button>
              </Upload>
            </Card>
          </div>
        </section>

        <Row gutter={[18, 18]} style={{ marginBottom: 18 }}>
          <Col xs={24} lg={14}>
            <div className="aca-aboutStories">
              <Form.List name="stories">
                {(storyFields, { add: addStory, remove: removeStory }) => (
                  <>
                    {storyFields.map((storyField, storyIndex) => {
                      const storyImages = stories[storyIndex]?.images || [];

                      return (
                      <Card
                        key={storyField.key}
                        className="aca-sidebarCard aca-aboutStory"
                        title={`Story ${storyIndex + 1}`}
                        extra={
                          canManage && storyFields.length > 1 ? (
                            <Button onClick={() => removeStory(storyField.name)}>
                              Remove Story
                            </Button>
                          ) : null
                        }
                        styles={{ body: { padding: 18 } }}
                      >
                        <Form.Item
                          name={[storyField.name, "title"]}
                          label="Story title"
                          rules={[
                            { required: true, message: "Enter story title" },
                          ]}
                        >
                          <Input />
                        </Form.Item>

                        <Form.List name={[storyField.name, "paragraphs"]}>
                          {(paragraphFields, { add, remove }) => (
                            <Space
                              direction="vertical"
                              style={{ width: "100%" }}
                            >
                              {paragraphFields.map((paragraphField) => (
                                <div key={paragraphField.key}>
                                  <Form.Item
                                    {...paragraphField}
                                    label="Paragraph"
                                    rules={[
                                      {
                                        required: true,
                                        message: "Enter paragraph text",
                                      },
                                    ]}
                                  >
                                    <Input.TextArea
                                      autoSize={{ minRows: 3, maxRows: 8 }}
                                    />
                                  </Form.Item>
                                  {canManage && paragraphFields.length > 1 ? (
                                    <Button
                                      onClick={() =>
                                        remove(paragraphField.name)
                                      }
                                    >
                                      Remove Paragraph
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                              {canManage ? (
                                <Button onClick={() => add("")}>
                                  Add Paragraph
                                </Button>
                              ) : null}
                            </Space>
                          )}
                        </Form.List>

                        <Card
                          size="small"
                          title="Story images"
                          style={{ marginTop: 16 }}
                        >
                          <Row gutter={[12, 12]}>
                            {storyImages.map((image, imageIndex) => (
                              <Col
                                xs={24}
                                md={12}
                                key={`${image.url}-${imageIndex}`}
                              >
                                <Card
                                  size="small"
                                  title={`Image ${imageIndex + 1}`}
                                >
                                  {resolveImageUrl(image.url) ? (
                                    <Image
                                      src={
                                        resolveImageUrl(image.url) || undefined
                                      }
                                      alt={image.alt}
                                      style={{
                                        width: "100%",
                                        aspectRatio: "3 / 4",
                                        objectFit: "cover",
                                        borderRadius: 8,
                                      }}
                                    />
                                  ) : null}

                                  <Form.Item
                                    name={[
                                      storyField.name,
                                      "images",
                                      imageIndex,
                                      "url",
                                    ]}
                                    hidden
                                    rules={[{ required: true }]}
                                  >
                                    <Input />
                                  </Form.Item>

                                  <Form.Item
                                    name={[
                                      storyField.name,
                                      "images",
                                      imageIndex,
                                      "alt",
                                    ]}
                                    label="Alt text"
                                    rules={[{ required: true }]}
                                    style={{ marginTop: 12 }}
                                  >
                                    <Input />
                                  </Form.Item>

                                  <Space wrap>
                                    <Upload
                                      {...storyImageUploadProps(
                                        storyIndex,
                                        imageIndex,
                                      )}
                                    >
                                      <Button icon={<UploadOutlined />}>
                                        Replace
                                      </Button>
                                    </Upload>
                                    {canManage ? (
                                      <Popconfirm
                                        title="Remove this story picture?"
                                        onConfirm={() =>
                                          removeStoryImage(
                                            storyIndex,
                                            imageIndex,
                                          )
                                        }
                                      >
                                        <Button
                                          danger
                                          icon={<DeleteOutlined />}
                                        >
                                          Remove
                                        </Button>
                                      </Popconfirm>
                                    ) : null}
                                  </Space>
                                </Card>
                              </Col>
                            ))}

                            {canManage && storyImages.length < 6 ? (
                              <Col xs={24} md={12}>
                                <Card
                                  size="small"
                                  style={{
                                    minHeight: 220,
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  <Upload
                                    {...storyImageUploadProps(
                                      storyIndex,
                                      storyImages.length,
                                    )}
                                  >
                                    <Button icon={<UploadOutlined />}>
                                      Add Story Picture
                                    </Button>
                                  </Upload>
                                </Card>
                              </Col>
                            ) : null}
                          </Row>
                        </Card>
                      </Card>
                      );
                    })}
                    {canManage ? (
                      <Button
                        onClick={() =>
                          addStory({ title: "", paragraphs: [""] })
                        }
                      >
                        Add Story
                      </Button>
                    ) : null}
                  </>
                )}
              </Form.List>

            </div>
          </Col>

          <Col xs={24} lg={10}>
            <Form.List name="values">
              {(fields, { add, remove }) => (
                <div className="aca-aboutValues">
                  {fields.map((field) => (
                    <Card key={field.key} className="aca-aboutValue">
                      <Form.Item
                        name={[field.name, "title"]}
                        label="Value title"
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "text"]}
                        label="Value text"
                        rules={[{ required: true }]}
                      >
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                      </Form.Item>
                      {canManage && fields.length > 1 ? (
                        <Button onClick={() => remove(field.name)}>
                          Remove Value
                        </Button>
                      ) : null}
                    </Card>
                  ))}
                  {canManage ? (
                    <Button onClick={() => add({ title: "", text: "" })}>
                      Add Value
                    </Button>
                  ) : null}
                </div>
              )}
            </Form.List>
          </Col>
        </Row>

        <Card title="Checkout success acknowledgement">
          <Paragraph type="secondary">
            This appears after an order is placed, on the successful checkout
            confirmation.
          </Paragraph>
          <Row gutter={[18, 0]}>
            <Col xs={24} lg={8}>
              <Form.Item
                name="acknowledgementTitle"
                label="Acknowledgement title"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} lg={16}>
              <Form.Item
                name="acknowledgementText"
                label="Acknowledgement text"
                rules={[{ required: true }]}
              >
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Card>
  );
}
