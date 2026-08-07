import type { LoaderFunctionArgs } from "react-router";
import ExcelJS from "exceljs";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const diamonds = await prisma.diamond.findMany({ where: { shop: session.shop }, orderBy: { certificate: "asc" } });
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Diamonds", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = ["certificate","diamond_type","shape","carat","color","clarity","cut","polish","symmetry","fluorescence","lab","price","stock","status","image_url","video_url","report_url","sku"].map((header) => ({ header, key: header, width: header.includes("url") ? 30 : 16 }));
  diamonds.forEach((d) => sheet.addRow({ certificate: d.certificate, diamond_type: d.type, shape: d.shape, carat: Number(d.carat), color: d.color, clarity: d.clarity, cut: d.cut, polish: d.polish || "", symmetry: d.symmetry || "", fluorescence: d.fluorescence || "", lab: d.lab, price: d.priceCents / 100, stock: d.stock, status: d.status, image_url: d.imageUrl || "", video_url: d.videoUrl || "", report_url: d.reportUrl || "", sku: d.sku || "" }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF98641E" } }; sheet.autoFilter = { from: "A1", to: "R1" };
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=renaissance-diamonds.xlsx" } });
}
