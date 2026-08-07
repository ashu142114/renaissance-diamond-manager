import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { storefrontVariantId } from "../lib/shopify-sync.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session?.shop) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url); const type = url.searchParams.get("type");
  const diamonds = await prisma.diamond.findMany({ where: { shop: session.shop, status: "ACTIVE", stock: { gt: 0 }, shopifyVariantId: { not: null }, ...(type === "LAB_GROWN" || type === "NATURAL" ? { type } : {}) }, orderBy: [{ type: "asc" }, { priceCents: "asc" }] });
  return Response.json({ diamonds: diamonds.map((d) => ({ id: d.id, certificate: d.certificate, type: d.type, title: `${d.type === "LAB_GROWN" ? "Lab-Grown" : "Natural"} ${d.shape} Diamond`, shape: d.shape, carat: Number(d.carat), color: d.color, clarity: d.clarity, cut: d.cut, polish: d.polish, symmetry: d.symmetry, fluorescence: d.fluorescence, lab: d.lab, price: d.priceCents, stock: d.stock, image: d.imageUrl, videoUrl: d.videoUrl, reportUrl: d.reportUrl, variantId: storefrontVariantId(d) })) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
