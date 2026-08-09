import { z } from "zod";

export const diamondTypes = ["LAB_GROWN", "NATURAL"] as const;
export const diamondStatuses = ["ACTIVE", "INACTIVE", "SOLD"] as const;
export const diamondShapes = [
  "Round",
  "Cushion",
  "Heart",
  "Marquise",
  "Oval",
  "Pear",
  "Emerald",
  "Princess",
  "Radiant",
  "Old Miner",
  "Asscher",
] as const;

const optionalUrl = z.union([z.literal(""), z.string().url()]).optional();

export const diamondSchema = z.object({
  certificate: z.string().trim().min(2, "Certificate number is required").max(100),
  type: z.enum(diamondTypes),
  shape: z.enum(diamondShapes, { message: "Select a valid diamond shape" }),
  carat: z.coerce.number().positive().max(100),
  color: z.string().trim().min(1).max(20),
  clarity: z.string().trim().min(1).max(20),
  cut: z.string().trim().min(1).max(40),
  polish: z.string().trim().max(40).optional().default(""),
  symmetry: z.string().trim().max(40).optional().default(""),
  fluorescence: z.string().trim().max(40).optional().default(""),
  lab: z.string().trim().min(1).max(30),
  price: z.coerce.number().nonnegative().max(10_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(1),
  status: z.enum(diamondStatuses).default("ACTIVE"),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  reportUrl: optionalUrl,
  sku: z.string().trim().max(100).optional().default(""),
});

export type DiamondInput = z.infer<typeof diamondSchema>;

export const normalizedCertificate = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "");

export const formDataToDiamond = (formData: FormData) =>
  diamondSchema.safeParse({
    certificate: formData.get("certificate"),
    type: formData.get("type"),
    shape: formData.get("shape"),
    carat: formData.get("carat"),
    color: formData.get("color"),
    clarity: formData.get("clarity"),
    cut: formData.get("cut"),
    polish: formData.get("polish"),
    symmetry: formData.get("symmetry"),
    fluorescence: formData.get("fluorescence"),
    lab: formData.get("lab"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    status: formData.get("status"),
    imageUrl: formData.get("imageUrl"),
    videoUrl: formData.get("videoUrl"),
    reportUrl: formData.get("reportUrl"),
    sku: formData.get("sku"),
  });

export const toDbDiamond = (shop: string, input: DiamondInput) => ({
  shop,
  certificate: normalizedCertificate(input.certificate),
  type: input.type,
  shape: input.shape,
  carat: input.carat,
  color: input.color.toUpperCase(),
  clarity: input.clarity.toUpperCase(),
  cut: input.cut,
  polish: input.polish || null,
  symmetry: input.symmetry || null,
  fluorescence: input.fluorescence || null,
  lab: input.lab.toUpperCase(),
  priceCents: Math.round(input.price * 100),
  stock: input.stock,
  status: input.status,
  imageUrl: input.imageUrl || null,
  videoUrl: input.videoUrl || null,
  reportUrl: input.reportUrl || null,
  sku: input.sku || null,
});

export const flattenZodErrors = (error: z.ZodError) =>
  Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] || "form"), issue.message]),
  );
