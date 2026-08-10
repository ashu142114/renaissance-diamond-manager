import type { LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import prisma from "../db.server";\nimport { diamondShapes } from "../lib/diamond";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const type = url.searchParams.get("type") || "";
  const status = url.searchParams.get("status") || "";\n  const shape = url.searchParams.get("shape") || "";
  const where = {
    shop: session.shop,
    ...(type ? { type } : {}), ...(status ? { status } : {}), ...(shape ? { shape } : {}),
    ...(q ? { OR: ["certificate", "shape", "lab", "sku"].map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } })) } : {}),
  };
  const [diamonds, total, active, lab, natural] = await Promise.all([
    prisma.diamond.findMany({ where, orderBy: { updatedAt: "desc" }, take: 250 }),
    prisma.diamond.count({ where: { shop: session.shop } }),
    prisma.diamond.count({ where: { shop: session.shop, status: "ACTIVE" } }),
    prisma.diamond.count({ where: { shop: session.shop, type: "LAB_GROWN" } }),
    prisma.diamond.count({ where: { shop: session.shop, type: "NATURAL" } }),
  ]);
  return { diamonds, stats: { total, active, lab, natural }, filters: { q, type, status, shape } };
}

export default function DiamondsIndex() {
  const { diamonds, stats, filters } = useLoaderData<typeof loader>();
  return <main className="dm-page">
    <header className="dm-header"><div><span className="dm-eyebrow">Renaissance Jewel</span><h1 className="dm-title">Diamond Manager</h1><p className="dm-subtitle">Manage inventory, imports and Shopify cart variants in one place.</p></div>
      <div className="dm-actions"><a className="dm-btn dm-btn--export" href="/app/export/csv" target="_blank" rel="noreferrer" download>↓ Export CSV</a><a className="dm-btn dm-btn--export" href="/app/export/xlsx" target="_blank" rel="noreferrer" download>↓ Export Excel</a><Link className="dm-btn dm-btn--import" to="/app/import">↑ Import</Link><Link className="dm-btn dm-btn--primary" to="/app/diamonds/new">＋ Add diamond</Link></div></header>
    <section className="dm-stats"><div className="dm-stat"><span>Total</span><strong>{stats.total}</strong></div><div className="dm-stat"><span>Active</span><strong>{stats.active}</strong></div><div className="dm-stat"><span>Lab-Grown</span><strong>{stats.lab}</strong></div><div className="dm-stat"><span>Natural</span><strong>{stats.natural}</strong></div></section>
    <section className="dm-card"><Form className="dm-toolbar"><input className="dm-input" name="q" placeholder="Certificate, lab or SKU" defaultValue={filters.q}/><select className="dm-select" name="shape" defaultValue={filters.shape}><option value="">All shapes</option>{diamondShapes.map((shape) => <option key={shape} value={shape}>{shape}</option>)}</select><select className="dm-select" name="type" defaultValue={filters.type}><option value="">All types</option><option value="LAB_GROWN">Lab-Grown</option><option value="NATURAL">Natural</option></select><select className="dm-select" name="status" defaultValue={filters.status}><option value="">All statuses</option><option>ACTIVE</option><option>INACTIVE</option><option>SOLD</option></select><button className="dm-btn dm-btn--filter" type="submit">Apply filters</button></Form>
      {diamonds.length ? <div className="dm-table-wrap"><table className="dm-table"><thead><tr><th>Diamond</th><th>Certificate</th><th>Type</th><th>Specs</th><th>Price</th><th>Stock</th><th>Status</th><th>Shopify</th><th></th></tr></thead><tbody>{diamonds.map((d) => <tr key={d.id}><td>{d.imageUrl ? <img className="dm-thumb" src={d.imageUrl} alt={d.certificate} width="54" height="54"/> : "—"}</td><td><strong>{d.certificate}</strong><br/><small>{d.lab}</small></td><td><span className={`dm-badge dm-badge--${d.type === "LAB_GROWN" ? "lab" : "natural"}`}>{d.type === "LAB_GROWN" ? "Lab-Grown" : "Natural"}</span></td><td>{d.shape} · {
  typeof d.carat === "object"
    ? d.carat?.value ?? d.carat?.carat ?? ""
    : d.carat
}ct · {d.color} · {d.clarity}</td><td>${(d.priceCents / 100).toFixed(2)}</td><td>{d.stock}</td><td><span className={`dm-badge dm-badge--${d.status.toLowerCase()}`}>{d.status}</span></td><td>{d.shopifyVariantId ? "Synced" : "Pending"}</td><td><Link className="dm-btn" to={`/app/diamonds/${d.id}`}>Edit</Link></td></tr>)}</tbody></table></div> : <div className="dm-empty"><p>No diamonds found.</p><Link className="dm-btn dm-btn--primary" to="/app/diamonds/new">Add first diamond</Link></div>}
    </section>
  </main>;
}
