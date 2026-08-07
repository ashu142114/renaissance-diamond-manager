import type { Diamond } from "@prisma/client";

type AdminClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

const productId = () => {
  const value = process.env.SHOPIFY_DIAMOND_PRODUCT_ID;
  if (!value) throw new Error("SHOPIFY_DIAMOND_PRODUCT_ID is not configured");
  return value;
};

const numericVariantId = (gid: string) => gid.split("/").pop() || gid;

async function readGraphql(response: Response) {
  const payload = await response.json() as {
    data?: Record<string, any>;
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length) throw new Error(payload.errors.map((item) => item.message).join("; "));
  return payload.data || {};
}

export async function createShopifyVariant(admin: AdminClient, diamond: Diamond) {
  const response = await admin.graphql(
    `#graphql
      mutation CreateDiamondVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants { id title }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        productId: productId(),
        variants: [{
          price: (diamond.priceCents / 100).toFixed(2),
          optionValues: [{ optionName: "Certificate", name: diamond.certificate }],
          inventoryItem: { sku: diamond.sku || `RB-${diamond.certificate}`, tracked: false },
        }],
      },
    },
  );
  const data = await readGraphql(response);
  const result = data.productVariantsBulkCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((item: { message: string }) => item.message).join("; "));
  }
  const variant = result.productVariants?.[0];
  if (!variant) throw new Error("Shopify did not return the created variant");
  return { productId: productId(), variantId: variant.id as string };
}

export async function updateShopifyVariant(admin: AdminClient, diamond: Diamond) {
  if (!diamond.shopifyVariantId) return createShopifyVariant(admin, diamond);
  const response = await admin.graphql(
    `#graphql
      mutation UpdateDiamondVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id title }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        productId: productId(),
        variants: [{
          id: diamond.shopifyVariantId,
          price: (diamond.priceCents / 100).toFixed(2),
          inventoryItem: { sku: diamond.sku || `RB-${diamond.certificate}`, tracked: false },
        }],
      },
    },
  );
  const data = await readGraphql(response);
  const errors = data.productVariantsBulkUpdate?.userErrors || [];
  if (errors.length) throw new Error(errors.map((item: { message: string }) => item.message).join("; "));
  return { productId: productId(), variantId: diamond.shopifyVariantId };
}

export async function deleteShopifyVariant(admin: AdminClient, diamond: Diamond) {
  if (!diamond.shopifyVariantId) return;
  const response = await admin.graphql(
    `#graphql
      mutation DeleteDiamondVariant($productId: ID!, $variantsIds: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
          userErrors { field message }
        }
      }`,
    {
      variables: {
        productId: productId(),
        variantsIds: [diamond.shopifyVariantId],
      },
    },
  );
  const data = await readGraphql(response);
  const errors = data.productVariantsBulkDelete?.userErrors || [];
  if (errors.length) throw new Error(errors.map((item: { message: string }) => item.message).join("; "));
}

export const storefrontVariantId = (diamond: Diamond) =>
  diamond.shopifyVariantId ? Number(numericVariantId(diamond.shopifyVariantId)) : null;
