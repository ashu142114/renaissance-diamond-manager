# Renaissance Diamond Manager

Embedded Shopify inventory app for Renaissance Jewel. Staff can manage Lab-Grown and Natural diamonds, import CSV/Excel inventory, export data, and keep each diamond connected to a valid Shopify product variant for the ring-builder cart.

## Included

- Manual add, edit and delete
- CSV/XLS/XLSX import with preview, row validation and error report
- CSV and Excel export
- Duplicate certificate prevention per store
- Lab-Grown/Natural tabs via storefront API filter
- Image, video and certificate URLs
- Full grading, price, stock and status fields
- Automatic Shopify variant create/update/delete
- Render PostgreSQL schema and Render deployment config
- Signed Shopify app-proxy storefront feed

## Local setup

1. Copy `.env.example` to `.env` and enter Shopify app credentials.
2. Create PostgreSQL and set `DATABASE_URL`.
3. Run `npm install`, `npm run db:push`, then `npm run dev`.
4. In Shopify Partner/Dev Dashboard, use the scopes from `shopify.app.toml`.
5. Keep `SHOPIFY_DIAMOND_PRODUCT_ID` set to the product used for diamond cart variants.

## Storefront integration

Configure the app proxy as `/apps/diamonds`. The signed endpoint returns:

- `/apps/diamonds?type=LAB_GROWN`
- `/apps/diamonds?type=NATURAL`

Every result includes a numeric `variantId`. The ring-builder must send this ID to Shopify `/cart/add.js`; it must never use a dummy or deleted variant ID.

## Render deployment

1. Push this folder to the `renaissance-diamond-manager` GitHub repository.
2. In Render, create a Blueprint from `render.yaml`.
3. Set `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`, and `SHOPIFY_DIAMOND_PRODUCT_ID`.
4. Update `shopify.app.toml` URLs and deploy the Shopify app config.
5. Install the app on the store, then import the inventory template from the Import screen.

The generated templates are in `public/templates` and are downloadable from the app.
