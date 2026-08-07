import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { DiamondForm } from "../components/DiamondForm";
import prisma from "../db.server";
import { flattenZodErrors, formDataToDiamond, normalizedCertificate, toDbDiamond } from "../lib/diamond";
import { deleteShopifyVariant, updateShopifyVariant } from "../lib/shopify-sync.server";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const diamond = await prisma.diamond.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!diamond) throw new Response("Not found", { status: 404 });
  return { diamond };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const current = await prisma.diamond.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!current) throw new Response("Not found", { status: 404 });
  const formData = await request.formData();
  if (formData.get("intent") === "delete") {
    try { await deleteShopifyVariant(admin, current); } catch (error) { return { errors: { form: error instanceof Error ? error.message : "Shopify delete failed" } }; }
    await prisma.diamond.delete({ where: { id: current.id } });
    return redirect("/app");
  }
  const parsed = formDataToDiamond(formData);
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };
  const certificate = normalizedCertificate(parsed.data.certificate);
  const duplicate = await prisma.diamond.findFirst({ where: { shop: session.shop, certificate, NOT: { id: current.id } } });
  if (duplicate) return { errors: { certificate: "This certificate already exists" } };
  const updated = await prisma.diamond.update({ where: { id: current.id }, data: toDbDiamond(session.shop, parsed.data) });
  try {
    const sync = await updateShopifyVariant(admin, updated);
    await prisma.diamond.update({ where: { id: current.id }, data: { shopifyProductId: sync.productId, shopifyVariantId: sync.variantId } });
  } catch (error) { return { errors: { form: error instanceof Error ? `Saved, but Shopify sync failed: ${error.message}` : "Shopify sync failed" } }; }
  return redirect("/app");
}

export default function EditDiamond() {
  const { diamond } = useLoaderData<typeof loader>(); const data = useActionData<typeof action>();
  return <main className="dm-page"><header className="dm-header"><div><span className="dm-eyebrow">{diamond.certificate}</span><h1 className="dm-title">Edit diamond</h1><p className="dm-subtitle">Changes also update the linked Shopify variant.</p></div><Form method="post"><input type="hidden" name="intent" value="delete"/><button className="dm-btn dm-btn--danger" type="submit">Delete diamond</button></Form></header><Form method="post" className="dm-card"><DiamondForm diamond={diamond} errors={data?.errors} submitLabel="Save changes"/></Form></main>;
}
