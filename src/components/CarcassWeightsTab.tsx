import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { api } from "../api/client";
import type { AdminPermission } from "../pages/admin/AdminDashboardPage";

const { Text } = Typography;

type AnimalKind = "beef" | "pig" | "lamb" | "chicken" | "carcass";
type SourcePart =
  | "HINDQUARTER_1"
  | "HINDQUARTER_2"
  | "FOREQUARTER_1"
  | "FOREQUARTER_2"
  | "WHOLE_CARCASS"
  | "WHOLE_BATCH";

const partLabels: Record<SourcePart, string> = {
  HINDQUARTER_1: "Hindquarter 1",
  HINDQUARTER_2: "Hindquarter 2",
  FOREQUARTER_1: "Forequarter 1",
  FOREQUARTER_2: "Forequarter 2",
  WHOLE_CARCASS: "Whole carcass",
  WHOLE_BATCH: "Whole chicken batch",
};

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  stockQty?: number;
  categoryId?: string | null;
  isFifthQuarter?: boolean;
  isForProcessing?: boolean;
};

type CategoryOption = { id: string; name: string; key: string };

type Output = {
  id: string;
  productId: string;
  totalWeightKg: number | string;
  packetCount: number;
  product?: ProductOption;
  downstreamBatches?: Array<{
    id: string;
    inputWeightKg: number | string;
    outputs?: Array<{ totalWeightKg: number | string }>;
  }>;
};

type ProcessingBatch = {
  id: string;
  carcassBatchId?: string | null;
  sourcePart?: SourcePart | null;
  sourceOutputId?: string | null;
  sourceOutput?: Output | null;
  processedAt: string;
  inputWeightKg: number | string;
  notes?: string | null;
  outputs?: Output[];
};

type FifthQuarterRow = {
  id: string;
  productId: string;
  totalWeightKg: number | string;
  packetCount: number;
  notes?: string | null;
  product?: ProductOption;
  processingBatches?: ProcessingBatch[];
};

type QuarterSale = {
  id: string;
  sourcePart: SourcePart;
  weightKg: number | string;
  soldAt: string;
  buyer?: string | null;
  salePrice?: number | string | null;
  notes?: string | null;
};

type CarcassBatchRecord = {
  id: string;
  animalId: string;
  meatCategoryId?: string | null;
  slaughterSheetNumber?: number | null;
  slaughterSheetYear?: number | null;
  liveWeightDate?: string | null;
  liveWeightKg?: number | string | null;
  noHq?: number | null;
  batchQuantity?: number | null;
  weighedAt: string;
  hindquarterDryDate?: string | null;
  forequarterDryDate?: string | null;
  notes?: string | null;
  meatCategory?: CategoryOption | null;
  hindquarterWeight1Kg: number | string;
  hindquarterWeight2Kg: number | string;
  forequarterWeight1Kg: number | string;
  forequarterWeight2Kg: number | string;
  hindquarterDryWeight1Kg?: number | string | null;
  hindquarterDryWeight2Kg?: number | string | null;
  forequarterDryWeight1Kg?: number | string | null;
  forequarterDryWeight2Kg?: number | string | null;
  fifthQuarterWeightKg?: number | string | null;
  totalCarcassWeightKg: number | string;
  totalWetWeightKg: number | string;
  totalDryWeightKg?: number | string | null;
  dryWeights?: FifthQuarterRow[];
  processingBatches?: ProcessingBatch[];
  quarterSales?: QuarterSale[];
};

type FifthQuarterItem = {
  productId: string;
  totalWeightKg: number;
  packetCount: number;
  notes?: string;
};

type WetForm = {
  meatCategoryId: string;
  animalId: string;
  liveWeightDate: dayjs.Dayjs;
  liveWeightKg: number;
  noHq: number;
  batchQuantity?: number | null;
  totalCarcassWeightKg: number;
  hindquarterWeight1Kg: number;
  hindquarterWeight2Kg: number;
  forequarterWeight1Kg: number;
  forequarterWeight2Kg: number;
  fifthQuarterItems: FifthQuarterItem[];
  notes?: string;
};

type DryForm = {
  weighedAt: dayjs.Dayjs;
  hindquarterDryDate?: dayjs.Dayjs | null;
  forequarterDryDate?: dayjs.Dayjs | null;
  hindquarterDryWeight1Kg?: number | null;
  hindquarterDryWeight2Kg?: number | null;
  forequarterDryWeight1Kg?: number | null;
  forequarterDryWeight2Kg?: number | null;
  totalDryWeightKg?: number | null;
};

type ProcessingForm = {
  sourcePart?: SourcePart;
  processedAt: dayjs.Dayjs;
  inputWeightKg: number;
  notes?: string;
  outputs: Array<{ productId: string; totalWeightKg: number; packetCount: number }>;
};

type SaleForm = {
  sourcePart: SourcePart;
  soldAt: dayjs.Dayjs;
  buyer?: string;
  salePrice?: number | null;
  notes?: string;
};

function n(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function kg(value: unknown) {
  return `${n(value).toFixed(2)} kg`;
}

function pct(source: unknown, result: unknown): number | null {
  const original = n(source);
  if (original <= 0) return null;
  return ((original - n(result)) / original) * 100;
}

function pctText(value: number | null) {
  return value === null ? "—" : `${Math.max(0, value).toFixed(1)}%`;
}

function processingOutputWeight(batch: ProcessingBatch) {
  return (batch.outputs || []).reduce(
    (total, output) => total + n(output.totalWeightKg),
    0,
  );
}

function kindOf(category?: { key?: string | null; name?: string | null } | null): AnimalKind {
  const value = `${category?.key || ""} ${category?.name || ""}`.toLowerCase();
  if (/beef|cattle|cow/.test(value)) return "beef";
  if (/pig|pork|swine/.test(value)) return "pig";
  if (/lamb|sheep|mutton/.test(value)) return "lamb";
  if (/chicken|poultry|broiler/.test(value)) return "chicken";
  return "carcass";
}

function hasPermission(permissions: AdminPermission[], needed: AdminPermission) {
  return permissions.includes("admin.full") || permissions.includes(needed);
}

function dryTotal(record: CarcassBatchRecord) {
  if (kindOf(record.meatCategory) === "beef") {
    return n(record.hindquarterDryWeight1Kg) + n(record.hindquarterDryWeight2Kg) + n(record.forequarterDryWeight1Kg) + n(record.forequarterDryWeight2Kg);
  }
  return n(record.totalDryWeightKg);
}

function processingHistory(record: CarcassBatchRecord) {
  return [
    ...(record.processingBatches || []),
    ...(record.dryWeights || []).flatMap((row) => row.processingBatches || []),
  ];
}

function sourceWeight(record: CarcassBatchRecord, part: SourcePart) {
  const kind = kindOf(record.meatCategory);
  const weights: Record<SourcePart, number> = {
    HINDQUARTER_1: n(record.hindquarterDryWeight1Kg),
    HINDQUARTER_2: n(record.hindquarterDryWeight2Kg),
    FOREQUARTER_1: n(record.forequarterDryWeight1Kg),
    FOREQUARTER_2: n(record.forequarterDryWeight2Kg),
    WHOLE_CARCASS: kind === "lamb" || kind === "carcass" ? dryTotal(record) || n(record.totalCarcassWeightKg) : n(record.totalCarcassWeightKg),
    WHOLE_BATCH: n(record.totalCarcassWeightKg),
  };
  return weights[part];
}

export default function CarcassWeightsTab({
  loading,
  records,
  permissions,
  onReload,
}: {
  loading: boolean;
  records: CarcassBatchRecord[];
  permissions: AdminPermission[];
  onReload: () => void;
}) {
  const canManage = hasPermission(permissions, "carcassweights.manage");
  const [wetForm] = Form.useForm<WetForm>();
  const [dryForm] = Form.useForm<DryForm>();
  const [processingForm] = Form.useForm<ProcessingForm>();
  const [saleForm] = Form.useForm<SaleForm>();
  const [wetOpen, setWetOpen] = useState(false);
  const [dryOpen, setDryOpen] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editing, setEditing] = useState<CarcassBatchRecord | null>(null);
  const [target, setTarget] = useState<CarcassBatchRecord | null>(null);
  const [processingSourceOutput, setProcessingSourceOutput] = useState<Output | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedCategoryId = Form.useWatch("meatCategoryId", wetForm);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedKind = kindOf(selectedCategory);
  const wetValues = Form.useWatch([], wetForm);
  const fifthItems = Form.useWatch("fifthQuarterItems", wetForm) || [];
  const dryValues = Form.useWatch([], dryForm);
  const selectedSource = Form.useWatch("sourcePart", processingForm);
  const processingInput = Form.useWatch("inputWeightKg", processingForm) || 0;
  const processingOutputs = Form.useWatch("outputs", processingForm) || [];

  const fifthProducts = products.filter((product) => product.isFifthQuarter && product.categoryId === selectedCategoryId);
  const outputProducts = products.filter((product) => !product.isFifthQuarter);
  const wetCarcassPreview = selectedKind === "beef"
    ? n(wetValues?.hindquarterWeight1Kg) + n(wetValues?.hindquarterWeight2Kg) + n(wetValues?.forequarterWeight1Kg) + n(wetValues?.forequarterWeight2Kg)
    : n(wetValues?.totalCarcassWeightKg);
  const fifthPreview = fifthItems.reduce((total, item) => total + n(item?.totalWeightKg), 0);
  const dryPreview = selectedKind === "beef"
    ? n(dryValues?.hindquarterDryWeight1Kg) + n(dryValues?.hindquarterDryWeight2Kg) + n(dryValues?.forequarterDryWeight1Kg) + n(dryValues?.forequarterDryWeight2Kg)
    : n(dryValues?.totalDryWeightKg);
  const outputPreview = processingOutputs.reduce((total, output) => total + n(output?.totalWeightKg), 0);
  const processLoss = pct(processingInput, outputPreview);

  const sourceOptions = target && kindOf(target.meatCategory) === "beef"
    ? (["HINDQUARTER_1", "HINDQUARTER_2", "FOREQUARTER_1", "FOREQUARTER_2"] as SourcePart[])
    : target && kindOf(target.meatCategory) === "chicken"
      ? (["WHOLE_BATCH"] as SourcePart[])
      : (["WHOLE_CARCASS"] as SourcePart[]);

  function processedFor(record: CarcassBatchRecord, part: SourcePart) {
    return (record.processingBatches || [])
      .filter((batch) => batch.sourcePart === part)
      .reduce(
        (total, batch) =>
          total +
          (batch.outputs || []).reduce(
            (outputTotal, output) => outputTotal + n(output.totalWeightKg),
            0,
          ),
        0,
      );
  }

  function availableFor(record: CarcassBatchRecord, part: SourcePart) {
    if ((record.quarterSales || []).some((sale) => sale.sourcePart === part)) return 0;
    return Math.max(0, sourceWeight(record, part) - processedFor(record, part));
  }

  function availableOutputWeight(output: Output) {
    return Math.max(
      0,
      n(output.totalWeightKg) -
        (output.downstreamBatches || []).reduce(
          (total, batch) =>
            total +
            (batch.outputs || []).reduce(
              (batchTotal, downstreamOutput) =>
                batchTotal + n(downstreamOutput.totalWeightKg),
              0,
            ),
          0,
        ),
    );
  }

  async function loadLookups(categoryRecord?: CarcassBatchRecord) {
    const [productResponse, categoryResponse] = await Promise.all([
      categoryRecord
        ? api.get(`/api/admin/carcass-weights/${encodeURIComponent(categoryRecord.animalId)}/products`)
        : api.get("/api/admin/products"),
      api.get("/api/admin/categories"),
    ]);
    const nextProducts = productResponse.data?.products || [];
    const nextCategories = categoryResponse.data?.categories || [];
    setProducts(nextProducts);
    setCategories(nextCategories);
    return { products: nextProducts as ProductOption[], categories: nextCategories as CategoryOption[] };
  }

  async function openNew() {
    setSaving(true);
    try {
      const lookups = await loadLookups();
      const category = lookups.categories[0];
      setEditing(null);
      wetForm.resetFields();
      wetForm.setFieldsValue({
        meatCategoryId: category?.id || "",
        animalId: "",
        liveWeightDate: dayjs(),
        liveWeightKg: 0,
        noHq: 2,
        batchQuantity: null,
        totalCarcassWeightKg: 0,
        hindquarterWeight1Kg: 0,
        hindquarterWeight2Kg: 0,
        forequarterWeight1Kg: 0,
        forequarterWeight2Kg: 0,
        fifthQuarterItems: [],
        notes: "",
      });
      setWetOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to load the entry form");
    } finally {
      setSaving(false);
    }
  }

  async function openEdit(record: CarcassBatchRecord) {
    setSaving(true);
    try {
      await loadLookups();
      setEditing(record);
      wetForm.resetFields();
      wetForm.setFieldsValue({
        meatCategoryId: record.meatCategoryId || "",
        animalId: record.animalId,
        liveWeightDate: dayjs(record.liveWeightDate || record.weighedAt),
        liveWeightKg: n(record.liveWeightKg),
        noHq: n(record.noHq),
        batchQuantity: record.batchQuantity,
        totalCarcassWeightKg: n(record.totalCarcassWeightKg),
        hindquarterWeight1Kg: n(record.hindquarterWeight1Kg),
        hindquarterWeight2Kg: n(record.hindquarterWeight2Kg),
        forequarterWeight1Kg: n(record.forequarterWeight1Kg),
        forequarterWeight2Kg: n(record.forequarterWeight2Kg),
        fifthQuarterItems: (record.dryWeights || []).filter((row) => row.product?.isFifthQuarter).map((row) => ({ productId: row.productId, totalWeightKg: n(row.totalWeightKg), packetCount: row.packetCount, notes: row.notes || "" })),
        notes: record.notes || "",
      });
      setWetOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Failed to load the entry");
    } finally {
      setSaving(false);
    }
  }

  async function saveWet() {
    const values = await wetForm.validateFields();
    setSaving(true);
    try {
      const payload = {
        ...values,
        liveWeightDate: values.liveWeightDate.toISOString(),
        weighedAt: values.liveWeightDate.toISOString(),
        batchQuantity: values.batchQuantity || null,
        fifthQuarterItems: selectedKind === "beef" ? (values.fifthQuarterItems || []) : [],
      };
      if (editing) await api.put(`/api/admin/carcass-weights/wet/${editing.id}`, payload);
      else await api.post("/api/admin/carcass-weights/wet", payload);
      message.success(editing ? "Carcass record updated" : "Carcass record created");
      setWetOpen(false);
      setEditing(null);
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not save the record");
    } finally {
      setSaving(false);
    }
  }

  function openDry(record: CarcassBatchRecord) {
    setTarget(record);
    dryForm.resetFields();
    dryForm.setFieldsValue({
      weighedAt: dayjs(),
      hindquarterDryDate: record.hindquarterDryDate ? dayjs(record.hindquarterDryDate) : dayjs(),
      forequarterDryDate: record.forequarterDryDate ? dayjs(record.forequarterDryDate) : dayjs(),
      hindquarterDryWeight1Kg: n(record.hindquarterDryWeight1Kg) || null,
      hindquarterDryWeight2Kg: n(record.hindquarterDryWeight2Kg) || null,
      forequarterDryWeight1Kg: n(record.forequarterDryWeight1Kg) || null,
      forequarterDryWeight2Kg: n(record.forequarterDryWeight2Kg) || null,
      totalDryWeightKg: n(record.totalDryWeightKg) || null,
    });
    setDryOpen(true);
  }

  async function saveDry() {
    if (!target) return;
    const values = await dryForm.validateFields();
    setSaving(true);
    try {
      await api.post("/api/admin/carcass-weights/dry", {
        animalId: target.animalId,
        ...values,
        weighedAt: values.weighedAt.toISOString(),
        hindquarterDryDate: values.hindquarterDryDate?.toISOString() || null,
        forequarterDryDate: values.forequarterDryDate?.toISOString() || null,
      });
      message.success("Dry weights saved");
      setDryOpen(false);
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not save dry weights");
    } finally {
      setSaving(false);
    }
  }

  async function openProcessing(record: CarcassBatchRecord) {
    setSaving(true);
    try {
      await loadLookups(record);
      setTarget(record);
      setProcessingSourceOutput(null);
      const kind = kindOf(record.meatCategory);
      const parts: SourcePart[] = kind === "beef"
        ? ["HINDQUARTER_1", "HINDQUARTER_2", "FOREQUARTER_1", "FOREQUARTER_2"]
        : kind === "chicken"
          ? ["WHOLE_BATCH"]
          : ["WHOLE_CARCASS"];
      const firstPart =
        parts.find((part) => availableFor(record, part) > 0.005) || parts[0];
      processingForm.resetFields();
      processingForm.setFieldsValue({
        sourcePart: firstPart,
        processedAt: dayjs(),
        inputWeightKg: availableFor(record, firstPart),
        notes: "",
        outputs: [{ productId: "", totalWeightKg: 0, packetCount: 1 }],
      });
      setProcessingOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not load products");
    } finally {
      setSaving(false);
    }
  }

  async function openProcessFurther(record: CarcassBatchRecord, output: Output) {
    setSaving(true);
    try {
      await loadLookups(record);
      setTarget(record);
      setProcessingSourceOutput(output);
      processingForm.resetFields();
      processingForm.setFieldsValue({
        processedAt: dayjs(),
        inputWeightKg: availableOutputWeight(output),
        notes: "",
        outputs: [{ productId: "", totalWeightKg: 0, packetCount: 1 }],
      });
      setProcessingOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not load products");
    } finally {
      setSaving(false);
    }
  }

  async function saveProcessing() {
    if (!target) return;
    const values = await processingForm.validateFields();
    if (outputPreview > n(values.inputWeightKg) + 0.005) {
      message.error("Finished-product weight cannot exceed the source input");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/admin/carcass-weights/process", {
        ...values,
        ...(processingSourceOutput
          ? { sourceOutputId: processingSourceOutput.id }
          : { carcassBatchId: target.id, sourcePart: values.sourcePart }),
        processedAt: values.processedAt.toISOString(),
      });
      message.success("Finished products added to stock");
      setProcessingOpen(false);
      setProcessingSourceOutput(null);
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Processing failed");
    } finally {
      setSaving(false);
    }
  }

  function openSale(record: CarcassBatchRecord) {
    setTarget(record);
    const available = (["HINDQUARTER_1", "HINDQUARTER_2", "FOREQUARTER_1", "FOREQUARTER_2"] as SourcePart[]).find((part) => availableFor(record, part) > 0.005);
    saleForm.resetFields();
    saleForm.setFieldsValue({ sourcePart: available || "HINDQUARTER_1", soldAt: dayjs(), buyer: "", salePrice: null, notes: "" });
    setSaleOpen(true);
  }

  async function saveSale() {
    if (!target) return;
    const values = await saleForm.validateFields();
    setSaving(true);
    try {
      await api.post("/api/admin/carcass-weights/quarter-sale", { ...values, carcassBatchId: target.id, soldAt: values.soldAt.toISOString() });
      message.success("Whole-quarter sale recorded without adding it to shop stock");
      setSaleOpen(false);
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not record sale");
    } finally {
      setSaving(false);
    }
  }

  async function reverseProcessing(id: string) {
    try {
      await api.delete(`/api/admin/carcass-weights/process/${id}`);
      message.success("Processing reversed and stock removed");
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not reverse processing");
    }
  }

  async function reverseSale(id: string) {
    try {
      await api.delete(`/api/admin/carcass-weights/quarter-sale/${id}`);
      message.success("Whole-quarter sale removed");
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not remove sale");
    }
  }

  async function deleteRecord(id: string) {
    try {
      await api.delete(`/api/admin/carcass-weights/wet/${id}`);
      message.success("Record deleted");
      onReload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || "Could not delete record");
    }
  }

  function shrinkage(record: CarcassBatchRecord) {
    const kind = kindOf(record.meatCategory);
    return kind === "beef" || kind === "lamb" || kind === "carcass" ? pct(record.totalCarcassWeightKg, dryTotal(record)) : null;
  }

  function overallProcessingLoss(record: CarcassBatchRecord) {
    const directBatches = (record.processingBatches || []).filter(
      (batch) => batch.sourcePart,
    );
    if (!directBatches.length) return null;
    const usedParts = [...new Set(directBatches.map((batch) => batch.sourcePart!))];
    const sourceTotal = usedParts.reduce(
      (total, part) => total + sourceWeight(record, part),
      0,
    );
    const outputTotal = directBatches.reduce(
      (total, batch) =>
        total +
        (batch.outputs || []).reduce(
          (batchTotal, output) => batchTotal + n(output.totalWeightKg),
          0,
        ),
      0,
    );
    return pct(sourceTotal, outputTotal);
  }

  function cumulativeProcessingLoss(
    record: CarcassBatchRecord,
    batch: ProcessingBatch,
  ) {
    const history = processingHistory(record);
    if (batch.sourcePart) {
      return pct(
        sourceWeight(record, batch.sourcePart),
        history
          .filter((item) => item.sourcePart === batch.sourcePart)
          .reduce((total, item) => total + processingOutputWeight(item), 0),
      );
    }
    if (batch.sourceOutputId && batch.sourceOutput) {
      return pct(
        batch.sourceOutput.totalWeightKg,
        history
          .filter((item) => item.sourceOutputId === batch.sourceOutputId)
          .reduce((total, item) => total + processingOutputWeight(item), 0),
      );
    }
    return pct(batch.inputWeightKg, processingOutputWeight(batch));
  }

  const columns = useMemo(() => [
    {
      title: "Sheet / Tag or Batch",
      key: "tag",
      render: (_: unknown, record: CarcassBatchRecord) => (
        <div style={{ display: "grid", gap: 2 }}>
          <b>{record.slaughterSheetNumber ? `${record.slaughterSheetYear}-${String(record.slaughterSheetNumber).padStart(3, "0")}` : "Auto"}</b>
          <Text type="secondary">{kindOf(record.meatCategory) === "chicken" ? "Batch" : "Tag"}: {record.animalId}</Text>
        </div>
      ),
    },
    { title: "Animal", key: "animal", render: (_: unknown, record: CarcassBatchRecord) => record.meatCategory?.name || "—" },
    { title: "Quantity", key: "quantity", width: 100, render: (_: unknown, record: CarcassBatchRecord) => kindOf(record.meatCategory) === "chicken" ? record.batchQuantity || "—" : "1" },
    { title: "Wet carcass / batch", key: "wet", width: 150, render: (_: unknown, record: CarcassBatchRecord) => kg(record.totalCarcassWeightKg) },
    { title: "Dry weight", key: "dry", width: 130, render: (_: unknown, record: CarcassBatchRecord) => dryTotal(record) > 0 ? kg(dryTotal(record)) : <Text type="secondary">—</Text> },
    { title: "Shrinkage", key: "shrinkage", width: 110, render: (_: unknown, record: CarcassBatchRecord) => shrinkage(record) === null ? <Text type="secondary">—</Text> : <Tag color="blue">{pctText(shrinkage(record))}</Tag> },
    { title: "Processing loss", key: "loss", width: 130, render: (_: unknown, record: CarcassBatchRecord) => {
      const loss = overallProcessingLoss(record);
      if (loss === null) return <Text type="secondary">—</Text>;
      const differs = Math.abs(loss) > 0.01;
      return <Tag color={differs ? "red" : "green"}>{pctText(loss)}</Tag>;
    } },
    {
      title: "",
      key: "actions",
      width: 330,
      render: (_: unknown, record: CarcassBatchRecord) => canManage ? (
        <div className="aca-carcass-actions">
          <Button className="aca-carcass-actions__primary" type="primary" onClick={() => openProcessing(record)}>Process Products</Button>
          {(kindOf(record.meatCategory) === "beef" || kindOf(record.meatCategory) === "lamb" || kindOf(record.meatCategory) === "carcass") ? <Button onClick={() => openDry(record)}>Dry Weights</Button> : null}
          {kindOf(record.meatCategory) === "beef" ? <Button onClick={() => openSale(record)}>Sell Whole Quarter</Button> : null}
          <Button onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this record?" onConfirm={() => deleteRecord(record.id)} okButtonProps={{ danger: true }}><Button danger>Delete</Button></Popconfirm>
        </div>
      ) : null,
    },
  ], [canManage, records]);

  return (
    <Card title="Carcass Weights" extra={canManage ? <Button type="primary" onClick={openNew}>New Entry</Button> : null}>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={[...(records || [])].sort((a, b) => dayjs(b.weighedAt).valueOf() - dayjs(a.weighedAt).valueOf())}
        columns={columns as any}
        rowClassName={(record) =>
          Math.abs(overallProcessingLoss(record) || 0) > 0.01
            ? "aca-processing-loss-row"
            : ""
        }
        expandable={{
          expandedRowRender: (record: CarcassBatchRecord) => {
            const kind = kindOf(record.meatCategory);
            const fifthRows = (record.dryWeights || []).filter((row) => row.product?.isFifthQuarter);
            return (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                  <Card size="small"><Text type="secondary">Live weight</Text><div><b>{kg(record.liveWeightKg)}</b></div></Card>
                  <Card size="small"><Text type="secondary">Wet carcass / batch</Text><div><b>{kg(record.totalCarcassWeightKg)}</b></div></Card>
                  {kind === "chicken" ? <Card size="small"><Text type="secondary">Chickens in batch</Text><div><b>{record.batchQuantity || "—"}</b></div></Card> : null}
                  {kind === "beef" ? (["HINDQUARTER_1", "HINDQUARTER_2", "FOREQUARTER_1", "FOREQUARTER_2"] as SourcePart[]).map((part) => {
                    const wetMap: Record<string, unknown> = { HINDQUARTER_1: record.hindquarterWeight1Kg, HINDQUARTER_2: record.hindquarterWeight2Kg, FOREQUARTER_1: record.forequarterWeight1Kg, FOREQUARTER_2: record.forequarterWeight2Kg };
                    return <Card size="small" key={part}><Text type="secondary">{partLabels[part]}</Text><div><b>Wet {kg(wetMap[part])}</b></div><div>Dry {sourceWeight(record, part) ? kg(sourceWeight(record, part)) : "—"}</div><div>Shrinkage {pctText(sourceWeight(record, part) ? pct(wetMap[part], sourceWeight(record, part)) : null)}</div></Card>;
                  }) : null}
                  {(kind === "lamb" || kind === "carcass") ? <Card size="small"><Text type="secondary">Hung carcass</Text><div>Dry <b>{dryTotal(record) ? kg(dryTotal(record)) : "—"}</b></div><div>Shrinkage {pctText(shrinkage(record))}</div></Card> : null}
                </div>

                {kind === "beef" ? <div><Text strong>5th Quarter Products</Text><Table size="small" pagination={false} rowKey="id" dataSource={fifthRows} locale={{ emptyText: "No 5th quarter products recorded" }} columns={[
                  { title: "Product", render: (_: unknown, row: FifthQuarterRow) => row.product?.name || "—" },
                  { title: "Weight", dataIndex: "totalWeightKg", render: kg },
                  { title: "Packets", dataIndex: "packetCount" },
                  { title: "Notes", dataIndex: "notes", render: (value: string) => value || "—" },
                ]} /></div> : null}

                <div><Text strong>Processing History</Text><Table size="small" pagination={false} rowKey="id" dataSource={processingHistory(record)} rowClassName={(batch: ProcessingBatch) => Math.abs(cumulativeProcessingLoss(record, batch) || 0) > 0.01 ? "aca-processing-loss-row" : ""} locale={{ emptyText: "No products processed yet" }} columns={[
                  { title: "Source", render: (_: unknown, batch: ProcessingBatch) => batch.sourceOutput?.product?.name || (batch.sourcePart ? partLabels[batch.sourcePart] : "Legacy source") },
                  { title: "Date", dataIndex: "processedAt", render: (value: string) => dayjs(value).format("D MMM YYYY") },
                  { title: "Source weight", dataIndex: "inputWeightKg", render: kg },
                  { title: "Products", render: (_: unknown, batch: ProcessingBatch) => <Space wrap>{(batch.outputs || []).map((output) => output.product?.isForProcessing ? <Space key={output.id} size={4}><Tag color="orange">{output.product?.name}: {kg(availableOutputWeight(output))} of {kg(output.totalWeightKg)} available</Tag>{canManage && availableOutputWeight(output) > 0.005 ? <Button size="small" type="primary" onClick={() => openProcessFurther(record, output)}>Process Further</Button> : null}</Space> : <Tag key={output.id}>{output.product?.name}: {output.packetCount} packs / {kg(output.totalWeightKg)}</Tag>)}</Space> },
                  { title: "% loss", render: (_: unknown, batch: ProcessingBatch) => {
                    const loss = cumulativeProcessingLoss(record, batch);
                    return <Tag color={Math.abs(loss || 0) > 0.01 ? "red" : "green"}>{pctText(loss)}</Tag>;
                  } },
                  { title: "", render: (_: unknown, batch: ProcessingBatch) => canManage ? <Popconfirm title="Reverse processing and remove its stock?" onConfirm={() => reverseProcessing(batch.id)}><Button danger size="small">Reverse</Button></Popconfirm> : null },
                ]} /></div>

                {kind === "beef" ? <div><Text strong>Whole Quarter Sales (not shop stock)</Text><Table size="small" pagination={false} rowKey="id" dataSource={record.quarterSales || []} locale={{ emptyText: "No whole quarters sold" }} columns={[
                  { title: "Quarter", render: (_: unknown, sale: QuarterSale) => partLabels[sale.sourcePart] },
                  { title: "Weight", dataIndex: "weightKg", render: kg },
                  { title: "Sold", dataIndex: "soldAt", render: (value: string) => dayjs(value).format("D MMM YYYY") },
                  { title: "Buyer", dataIndex: "buyer", render: (value: string) => value || "—" },
                  { title: "Price", dataIndex: "salePrice", render: (value: unknown) => value === null || value === undefined ? "—" : `$${n(value).toFixed(2)}` },
                  { title: "", render: (_: unknown, sale: QuarterSale) => canManage ? <Popconfirm title="Remove this sale record?" onConfirm={() => reverseSale(sale.id)}><Button danger size="small">Remove</Button></Popconfirm> : null },
                ]} /></div> : null}
              </div>
            );
          },
        }}
      />

      <Modal title={editing ? "Edit Carcass Entry" : "New Carcass Entry"} open={wetOpen} onCancel={() => setWetOpen(false)} onOk={saveWet} confirmLoading={saving} width={980} okText="Save">
        <Form form={wetForm} layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Form.Item name="meatCategoryId" label="Animal" rules={[{ required: true }]}><Select disabled={!!editing} options={categories.map((category) => ({ value: category.id, label: category.name }))} onChange={() => wetForm.setFieldValue("fifthQuarterItems", [])} /></Form.Item>
            <Form.Item name="animalId" label={selectedKind === "chicken" ? "Batch Number" : "Tag Number"} rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
            <Form.Item name="liveWeightDate" label="Weight Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="liveWeightKg" label={selectedKind === "chicken" ? "Live Batch Weight (kg)" : "Live Weight (kg)"} rules={[{ required: true }]}><InputNumber min={0} step={0.1} style={{ width: "100%" }} /></Form.Item>
            {selectedKind === "chicken" ? <Form.Item name="batchQuantity" label="Number of Chickens" rules={[{ required: true }]}><InputNumber min={1} step={1} style={{ width: "100%" }} /></Form.Item> : null}
            {selectedKind === "beef" ? <Form.Item name="noHq" label="No. HQ" rules={[{ required: true }]}><InputNumber min={0} step={1} style={{ width: "100%" }} /></Form.Item> : null}
          </div>

          {selectedKind === "beef" ? <>
            <Divider orientation="left">Wet Quarter Weights</Divider>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {([['hindquarterWeight1Kg', 'Hindquarter 1'], ['hindquarterWeight2Kg', 'Hindquarter 2'], ['forequarterWeight1Kg', 'Forequarter 1'], ['forequarterWeight2Kg', 'Forequarter 2']] as const).map(([name, label]) => <Form.Item key={name} name={name} label={`${label} Wet Weight (kg)`} rules={[{ required: true }]}><InputNumber min={0} step={0.1} style={{ width: "100%" }} /></Form.Item>)}
            </div>
          </> : <Form.Item name="totalCarcassWeightKg" label={selectedKind === "chicken" ? "Whole Portioned Batch Starting Weight (kg)" : "Whole Carcass Weight (kg)"} rules={[{ required: true }]}><InputNumber min={0.01} step={0.1} style={{ width: "100%" }} /></Form.Item>}

          <Card size="small"><Space size="large" wrap><Text><b>Carcass / batch:</b> {kg(wetCarcassPreview)}</Text>{selectedKind === "beef" ? <Text><b>5th quarter:</b> {kg(fifthPreview)}</Text> : null}</Space></Card>

          {selectedKind === "beef" ? <>
            <Divider orientation="left">5th Quarter Products</Divider>
            <Form.List name="fifthQuarterItems">
              {(fields, { add, remove }) => <div style={{ display: "grid", gap: 10 }}>
                {fields.map((field) => {
                  const selectedIds = (wetForm.getFieldValue("fifthQuarterItems") || []).map((item: FifthQuarterItem) => item?.productId);
                  return <Card key={field.key} size="small"><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10 }}>
                    <Form.Item {...field} name={[field.name, "productId"]} label="Product" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={fifthProducts.filter((product) => !selectedIds.includes(product.id) || wetForm.getFieldValue(["fifthQuarterItems", field.name, "productId"]) === product.id).map((product) => ({ value: product.id, label: product.name }))} /></Form.Item>
                    <Form.Item {...field} name={[field.name, "totalWeightKg"]} label="Weight (kg)" rules={[{ required: true }]}><InputNumber min={0} step={0.1} style={{ width: "100%" }} /></Form.Item>
                    <Form.Item {...field} name={[field.name, "packetCount"]} label="Packets" rules={[{ required: true }]}><InputNumber min={0} step={1} style={{ width: "100%" }} /></Form.Item>
                    <Button danger style={{ marginTop: 30 }} onClick={() => remove(field.name)}>Remove</Button>
                  </div><Form.Item {...field} name={[field.name, "notes"]} label="Notes" style={{ marginBottom: 0 }}><Input /></Form.Item></Card>;
                })}
                <Button onClick={() => add({ productId: "", totalWeightKg: 0, packetCount: 0, notes: "" })}>Add Another 5th Quarter Product</Button>
                {fifthProducts.length === 0 ? <Text type="secondary">Create products marked “5th quarter” in this animal category to select them here.</Text> : null}
              </div>}
            </Form.List>
          </> : null}
          <Form.Item name="notes" label="Notes" style={{ marginTop: 16 }}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Dry Weights — ${target?.animalId || ""}`} open={dryOpen} onCancel={() => setDryOpen(false)} onOk={saveDry} confirmLoading={saving} okText="Save Dry Weights" width={800}>
        <Form form={dryForm} layout="vertical">
          <Form.Item name="weighedAt" label="Dry Weight Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          {target && kindOf(target.meatCategory) === "beef" ? <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <Form.Item name="hindquarterDryDate" label="Hindquarter Dry Date"><DatePicker style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="forequarterDryDate" label="Forequarter Dry Date"><DatePicker style={{ width: "100%" }} /></Form.Item>
              {([['hindquarterDryWeight1Kg', 'Hindquarter 1', target.hindquarterWeight1Kg], ['hindquarterDryWeight2Kg', 'Hindquarter 2', target.hindquarterWeight2Kg], ['forequarterDryWeight1Kg', 'Forequarter 1', target.forequarterWeight1Kg], ['forequarterDryWeight2Kg', 'Forequarter 2', target.forequarterWeight2Kg]] as const).map(([name, label, wet]) => <Form.Item key={name} name={name} label={`${label} Dry Weight (wet: ${kg(wet)})`} rules={[{ required: true }]}><InputNumber min={0.01} max={n(wet)} step={0.1} style={{ width: "100%" }} /></Form.Item>)}
            </div>
          </> : <Form.Item name="totalDryWeightKg" label={`Dry Carcass Weight (wet: ${kg(target?.totalCarcassWeightKg)})`} rules={[{ required: true }]}><InputNumber min={0.01} max={n(target?.totalCarcassWeightKg)} step={0.1} style={{ width: "100%" }} /></Form.Item>}
          <Card size="small"><Space size="large"><Text><b>Dry total:</b> {kg(dryPreview)}</Text><Text><b>Shrinkage:</b> {pctText(pct(target?.totalCarcassWeightKg, dryPreview))}</Text></Space></Card>
        </Form>
      </Modal>

      <Modal title={`${processingSourceOutput ? `Process ${processingSourceOutput.product?.name || "Processing Product"} Further` : "Process Products"} — ${target?.animalId || ""}`} open={processingOpen} onCancel={() => { setProcessingOpen(false); setProcessingSourceOutput(null); }} onOk={saveProcessing} confirmLoading={saving} okText="Process and Add Stock" width={900}>
        <Form form={processingForm} layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {processingSourceOutput ? <Card size="small"><Text type="secondary">Processing product source</Text><div><b>{processingSourceOutput.product?.name}</b></div><div>{kg(availableOutputWeight(processingSourceOutput))} available</div></Card> : <Form.Item name="sourcePart" label={target && kindOf(target.meatCategory) === "beef" ? "Quarter Cut From" : "Processing Source"} rules={[{ required: true }]}><Select options={target ? sourceOptions.map((part) => { const kind = kindOf(target.meatCategory); const basis = kind === "beef" || kind === "lamb" || kind === "carcass" ? "dry weight" : "starting weight"; return { value: part, label: `${partLabels[part]} — ${kg(availableFor(target, part))} remaining from ${kg(sourceWeight(target, part))} ${basis}`, disabled: availableFor(target, part) <= 0.005 }; }) : []} onChange={(part: SourcePart) => { if (target) processingForm.setFieldValue("inputWeightKg", availableFor(target, part)); }} /></Form.Item>}
            <Form.Item name="processedAt" label="Processing Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="inputWeightKg" label={target && kindOf(target.meatCategory) === "beef" && !processingSourceOutput ? "Remaining Quarter Dry Weight (kg)" : "Source Weight Used (kg)"} rules={[{ required: true }]} extra={target && kindOf(target.meatCategory) === "beef" && !processingSourceOutput ? "Locked to the selected quarter dry weight minus products already processed from it." : undefined}><InputNumber min={0.01} max={processingSourceOutput ? availableOutputWeight(processingSourceOutput) : target && selectedSource ? availableFor(target, selectedSource) : undefined} step={0.1} disabled={!processingSourceOutput} style={{ width: "100%" }} /></Form.Item>
          </div>
          <Divider orientation="left">Products Cut From This Source</Divider>
          <Form.List name="outputs">{(fields, { add, remove }) => <div style={{ display: "grid", gap: 10 }}>
            {fields.map((field) => {
              const chosenProductId = processingForm.getFieldValue(["outputs", field.name, "productId"]);
              const chosenProduct = outputProducts.find((product) => product.id === chosenProductId);
              return <Card key={field.key} size="small"><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10 }}>
              <Form.Item {...field} name={[field.name, "productId"]} label="Product" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={outputProducts.filter((product) => product.id !== processingSourceOutput?.productId).map((product) => ({ value: product.id, label: `${product.name} (${product.unit})${product.isForProcessing ? " — process further later" : ""}` }))} onChange={(productId) => { const product = outputProducts.find((candidate) => candidate.id === productId); processingForm.setFieldValue(["outputs", field.name, "packetCount"], product?.isForProcessing ? 0 : Math.max(1, n(processingForm.getFieldValue(["outputs", field.name, "packetCount"])))); }} /></Form.Item>
              <Form.Item {...field} name={[field.name, "totalWeightKg"]} label="Processed Weight (kg)" rules={[{ required: true }]}><InputNumber min={0.01} step={0.1} style={{ width: "100%" }} /></Form.Item>
              <Form.Item {...field} name={[field.name, "packetCount"]} label={chosenProduct?.isForProcessing ? "Packets (not shop stock)" : "Sellable Packets"} rules={[{ required: true }]}><InputNumber min={chosenProduct?.isForProcessing ? 0 : 1} step={1} disabled={chosenProduct?.isForProcessing} style={{ width: "100%" }} /></Form.Item>
              <Button danger disabled={fields.length === 1} style={{ marginTop: 30 }} onClick={() => remove(field.name)}>Remove</Button>
            </div>{chosenProduct?.isForProcessing ? <Text type="secondary">This weight stays available here and can be converted later with “Process Further”; it is not added to the shop.</Text> : null}</Card>})}
            <Button onClick={() => add({ productId: "", totalWeightKg: 0, packetCount: 1 })}>Add Another Product</Button>
          </div>}</Form.List>
          <Form.Item name="notes" label="Notes" style={{ marginTop: 12 }}><Input.TextArea rows={2} /></Form.Item>
          <Card size="small" className={outputPreview > 0.005 && Math.abs(n(processingInput) - outputPreview) > 0.005 ? "aca-processing-loss-card" : ""}><Space size="large" wrap><Text><b>Source:</b> {kg(processingInput)}</Text><Text><b>Products:</b> {kg(outputPreview)}</Text><Text type={Math.abs(n(processingInput) - outputPreview) > 0.005 ? "danger" : undefined}><b>Loss:</b> {kg(Math.max(0, n(processingInput) - outputPreview))} ({pctText(processLoss)})</Text></Space></Card>
        </Form>
      </Modal>

      <Modal title={`Sell Whole Beef Quarter — ${target?.animalId || ""}`} open={saleOpen} onCancel={() => setSaleOpen(false)} onOk={saveSale} confirmLoading={saving} okText="Record Sale" width={650}>
        <Form form={saleForm} layout="vertical">
          <Form.Item name="sourcePart" label="Quarter" rules={[{ required: true }]}><Select options={target ? (["HINDQUARTER_1", "HINDQUARTER_2", "FOREQUARTER_1", "FOREQUARTER_2"] as SourcePart[]).map((part) => ({ value: part, label: `${partLabels[part]} — ${kg(sourceWeight(target, part))}`, disabled: availableFor(target, part) <= 0.005 })) : []} /></Form.Item>
          <Form.Item name="soldAt" label="Sale Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="buyer" label="Buyer"><Input /></Form.Item>
          <Form.Item name="salePrice" label="Sale Price ($)"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
          <Text type="secondary">This records a direct whole-quarter sale. It does not create a shop product or change shop stock.</Text>
        </Form>
      </Modal>
    </Card>
  );
}
