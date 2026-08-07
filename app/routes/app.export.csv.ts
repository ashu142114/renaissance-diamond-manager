import type { LoaderFunctionArgs } from "react-router";
import { stringify } from "csv-stringify/sync";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const diamonds = await prisma.diamond.findMany({ where: { shop: session.shop }, orderBy: { certificate: "asc" } });
  const csv = stringify(diamonds.map((d) => ({ certificate: d.certificate, diamond_type: d.type, shape: d.shape, carat: String(d.carat), color: d.color, clarity: d.clarity, cut: d.cut, polish: d.polish || "", symmetry: d.symmetry || "", fluorescence: d.fluorescence || "", lab: d.lab, price: (d.priceCents / 100).toFixed(2), stock: d.stock, status: d.status, image_url: d.imageUrl || "", video_url: d.videoUrl || "", report_url: d.reportUrl || "", sku: d.sku || "" })), { header: true });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=renaissance-diamonds.csv" } });
}
