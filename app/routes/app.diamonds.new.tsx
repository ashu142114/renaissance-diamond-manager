import type { ActionFunctionArgs } from "react-router";
import { Form, redirect, useActionData } from "react-router";
import { DiamondForm } from "../components/DiamondForm";
import prisma from "../db.server";
import { flattenZodErrors, formDataToDiamond, normalizedCertificate, toDbDiamond } from "../lib/diamond";
import { createShopifyVariant } from "../lib/shopify-sync.server";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const parsed = formDataToDiamond(await request.formData());
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
  const certificate = normalizedCertificate(parsed.data.certificate);
  if (await prisma.diamond.findUnique({ where: { shop_certificate: { shop: session.shop, certificate } } })) return { errors: { certificate: "This certificate already exists" } };
  const diamond = await prisma.diamond.create({ data: toDbDiamond(session.shop, parsed.data) });
  try {
    const sync = await createShopifyVariant(admin, diamond);
    await prisma.diamond.update({ where: { id: diamond.id }, data: { shopifyProductId: sync.productId, shopifyVariantId: sync.variantId } });
  } catch (error) {
    await prisma.diamond.delete({ where: { id: diamond.id } });
    return { errors: { form: error instanceof Error ? `Shopify sync failed: ${error.message}` : "Shopify sync failed" } };
  }
  return redirect("/app");
}

export default function NewDiamond() { const data = useActionData<typeof action>(); return <main className="dm-page"><header className="dm-header"><div><span className="dm-eyebrow">Manual entry</span><h1 className="dm-title">Add diamond</h1><p className="dm-subtitle">Saving creates the matching Shopify cart variant automatically.</p></div></header><Form method="post" className="dm-card"><DiamondForm errors={data?.errors}/></Form></main>; }
