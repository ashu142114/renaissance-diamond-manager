import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { storefrontVariantId } from "../lib/shopify-sync.server";
import { authenticate } from "../shopify.server";

const APP_SHOP = process.env.SHOP_CUSTOM_DOMAIN || "0swgrw-wh.myshopify.com";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Shopify validates the signed app-proxy request here. Storefront visitors
    // do not always have a saved app session, so this single-store app uses its
    // configured shop only and never trusts a shop supplied by the browser.
    const { session } = await authenticate.public.appProxy(request);
    const shop = session?.shop || APP_SHOP;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    const diamonds = await prisma.diamond.findMany({
      where: {
        shop,
        status: "ACTIVE",
        stock: { gt: 0 },
        shopifyVariantId: { not: null },
        ...(type === "LAB_GROWN" || type === "NATURAL" ? { type } : {}),
      },
      orderBy: [{ type: "asc" }, { priceCents: "asc" }],
    });

    return Response.json(
      {
        diamonds: diamonds.map((d) => ({
          id: d.id,
          certificate: d.certificate,
          type: d.type,
          title: `${d.type === "LAB_GROWN" ? "Lab-Grown" : "Natural"} ${d.shape} Diamond`,
          shape: d.shape,
          carat: Number(d.carat),
          color: d.color,
          clarity: d.clarity,
          cut: d.cut,
          polish: d.polish,
          symmetry: d.symmetry,
          fluorescence: d.fluorescence,
          lab: d.lab,
          price: d.priceCents,
          stock: d.stock,
          image: d.imageUrl,
          videoUrl: d.videoUrl,
          reportUrl: d.reportUrl,
          variantId: storefrontVariantId(d),
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("Storefront diamond feed failed", error);
    return Response.json(
      { diamonds: [], error: "Diamond feed is temporarily unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
