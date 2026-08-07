import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { diamondSchema, normalizedCertificate, type DiamondInput } from "./diamond";

export type ImportRow = DiamondInput & { rowNumber: number };
export type RowError = {
  rowNumber: number;
  field?: string;
  message: string;
  rowData: Record<string, unknown>;
};

const headerAliases: Record<string, string> = {
  certificate: "certificate",
  certificate_id: "certificate",
  cert: "certificate",
  diamond_type: "type",
  type: "type",
  shape: "shape",
  carat: "carat",
  color: "color",
  clarity: "clarity",
  cut: "cut",
  polish: "polish",
  symmetry: "symmetry",
  fluorescence: "fluorescence",
  lab: "lab",
  price: "price",
  stock: "stock",
  status: "status",
  image_url: "imageUrl",
  imageurl: "imageUrl",
  video_url: "videoUrl",
  report_url: "reportUrl",
  certificate_url: "reportUrl",
  sku: "sku",
};

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const normalizeType = (value: unknown) => {
  const type = String(value ?? "").trim().toUpperCase().replace(/[ -]+/g, "_");
  if (type === "LAB" || type === "LABGROWN") return "LAB_GROWN";
  if (type === "NAT" || type === "NATURAL_DIAMOND") return "NATURAL";
  return type;
};

const normalizeStatus = (value: unknown) =>
  String(value || "ACTIVE").trim().toUpperCase();

function mapObject(raw: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const canonical = headerAliases[normalizeHeader(key)];
    if (canonical) mapped[canonical] = value;
  }
  mapped.type = normalizeType(mapped.type);
  mapped.status = normalizeStatus(mapped.status);
  mapped.certificate = normalizedCertificate(String(mapped.certificate || ""));
  return mapped;
}

function validateRows(rawRows: Record<string, unknown>[]) {
  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const mapped = mapObject(raw);
    const parsed = diamondSchema.safeParse(mapped);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push({
          rowNumber,
          field: String(issue.path[0] || ""),
          message: issue.message,
          rowData: raw,
        });
      });
      return;
    }

    const certificate = normalizedCertificate(parsed.data.certificate);
    if (seen.has(certificate)) {
      errors.push({
        rowNumber,
        field: "certificate",
        message: "Duplicate certificate inside this file",
        rowData: raw,
      });
      return;
    }
    seen.add(certificate);
    rows.push({ ...parsed.data, certificate, rowNumber });
  });

  return { rows, errors };
}

export async function parseDiamondFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "csv") {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, unknown>[];
    return validateRows(records);
  }

  if (extension === "xlsx" || extension === "xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { rows: [], errors: [{ rowNumber: 1, message: "Workbook has no sheets", rowData: {} }] };

    const headers = (sheet.getRow(1).values as unknown[])
      .slice(1)
      .map((value) => String(value ?? ""));
    const records: Record<string, unknown>[] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const values = (sheet.getRow(rowNumber).values as unknown[]).slice(1);
      if (values.every((value) => value === null || value === undefined || value === "")) continue;
      records.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
    }
    return validateRows(records);
  }

  return {
    rows: [],
    errors: [{ rowNumber: 1, message: "Only .csv, .xlsx and .xls files are supported", rowData: {} }],
  };
}
