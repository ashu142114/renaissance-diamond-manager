import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import { useEffect } from "react";
import prisma from "../db.server";
import { toDbDiamond, type DiamondInput } from "../lib/diamond";
import { parseDiamondFile, type ImportRow, type RowError } from "../lib/import.server";
import { createShopifyVariant } from "../lib/shopify-sync.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) { await authenticate.admin(request); return null; }

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  try {
    const formData = await request.formData();
  if (formData.get("intent") === "commit") {
    const job = await prisma.importJob.findFirst({ where: { id: String(formData.get("jobId")), shop: session.shop, status: "PREVIEW" } });
    if (!job) return { error: "Import preview expired or was not found." };
    const rows = job.payload as unknown as ImportRow[];
    let created = 0; const failures: RowError[] = [];
    for (const row of rows) {
      try {
        const exists = await prisma.diamond.findUnique({ where: { shop_certificate: { shop: session.shop, certificate: row.certificate } } });
        if (exists) throw new Error("Certificate already exists in database");
        const diamond = await prisma.diamond.create({ data: toDbDiamond(session.shop, row as DiamondInput) });
        try { const sync = await createShopifyVariant(admin, diamond); await prisma.diamond.update({ where: { id: diamond.id }, data: { shopifyProductId: sync.productId, shopifyVariantId: sync.variantId } }); }
        catch (error) { await prisma.diamond.delete({ where: { id: diamond.id } }); throw error; }
        created += 1;
      } catch (error) { failures.push({ rowNumber: row.rowNumber, field: "certificate", message: error instanceof Error ? error.message : "Import failed", rowData: row }); }
    }
    await prisma.importJob.update({ where: { id: job.id }, data: { status: failures.length ? "COMPLETED_WITH_ERRORS" : "COMPLETED", committedAt: new Date(), validRows: created, errorRows: failures.length } });
    if (!failures.length) return redirect("/app");
    return { committed: true, created, errors: failures };
  }
  const file = formData.get("file");
  const isUpload = file && typeof file === "object" && "arrayBuffer" in file && "name" in file && "size" in file;
  if (!isUpload || !(file as File).size) return { error: "Choose a CSV or Excel file." };
  const parsed = await parseDiamondFile(file as File);
  const certificates = parsed.rows.map((row) => row.certificate);
  const existing = await prisma.diamond.findMany({ where: { shop: session.shop, certificate: { in: certificates } }, select: { certificate: true } });
  const existingSet = new Set(existing.map((item) => item.certificate));
  const duplicateErrors = parsed.rows.filter((row) => existingSet.has(row.certificate)).map((row) => ({ rowNumber: row.rowNumber, field: "certificate", message: "Certificate already exists in database", rowData: row }));
  const rows = parsed.rows.filter((row) => !existingSet.has(row.certificate));
  const errors = [...parsed.errors, ...duplicateErrors];
  const job = await prisma.importJob.create({ data: { shop: session.shop, fileName: (file as File).name, totalRows: rows.length + errors.length, validRows: rows.length, errorRows: errors.length, payload: rows as any, errors: { create: errors.map((error) => ({ rowNumber: error.rowNumber, field: error.field, message: error.message, rowData: error.rowData as any })) } } });
  return { jobId: job.id, fileName: (file as File).name, rows, errors };
  } catch (error) {
    console.error("Diamond import preview failed", error);
    return { error: error instanceof Error ? error.message : "The file could not be processed. Please check the template and try again." };
  }
}

export default function ImportDiamonds() {
  const data = useActionData<typeof action>() as any;
  const navigation = useNavigation();
  const preview = data?.jobId ? data : null;
  const isSubmitting = navigation.state === "submitting";
  useEffect(() => {
    if (!data) return;
    window.setTimeout(() => document.querySelector("[data-import-result]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [data]);
  return <main className="dm-page"><header className="dm-header"><div><span className="dm-eyebrow">Bulk inventory</span><h1 className="dm-title">Import CSV / Excel</h1><p className="dm-subtitle">Preview and validate every row before anything is saved.</p></div><div className="dm-actions"><a className="dm-btn" href="/templates/renaissance-diamond-import.csv">CSV template</a><a className="dm-btn" href="/templates/renaissance-diamond-import.xlsx">Excel template</a></div></header>
    {data && "error" in data && <p className="dm-note dm-error" data-import-result>{data.error}</p>}
    <section className="dm-import-grid"><Form method="post" encType="multipart/form-data" className="dm-card"><div className="dm-drop"><h2>Select inventory file</h2><p>Accepted: .csv, .xlsx, .xls</p><input className="dm-file" name="file" type="file" accept=".csv,.xlsx,.xls" required/><br/><br/><button className="dm-btn dm-btn--primary" type="submit" name="intent" value="preview" disabled={isSubmitting}>{isSubmitting ? "Checking file…" : "Preview import"}</button></div></Form><aside className="dm-card"><h2>Import rules</h2><ul><li>Certificate must be unique.</li><li>Type must be LAB_GROWN or NATURAL.</li><li>Image and report fields use public URLs.</li><li>Invalid rows are skipped and reported.</li><li>Shopify variants are created only after confirmation.</li></ul></aside></section>
    {preview && <section className="dm-card" style={{marginTop:18}} data-import-result><h2>Preview: {preview.fileName}</h2><div className="dm-preview-summary"><strong>{preview.rows.length} valid</strong><strong className={preview.errors.length ? "dm-error" : "dm-success"}>{preview.errors.length} errors</strong></div>{preview.rows.length > 0 && <Form method="post"><input type="hidden" name="intent" value="commit"/><input type="hidden" name="jobId" value={preview.jobId}/><button className="dm-btn dm-btn--primary" type="submit">Import {preview.rows.length} valid diamonds</button></Form>}{preview.errors.length > 0 && <div className="dm-table-wrap" style={{marginTop:14}}><table className="dm-table"><thead><tr><th>Row</th><th>Field</th><th>Error</th></tr></thead><tbody>{preview.errors.map((e: RowError, i: number) => <tr key={i}><td>{e.rowNumber}</td><td>{e.field || "—"}</td><td className="dm-error">{e.message}</td></tr>)}</tbody></table></div>}</section>}
    {data && "committed" in data && <section className="dm-card" style={{marginTop:18}} data-import-result><h2>{data.created} diamonds imported</h2><p className="dm-error">{data.errors.length} rows failed during Shopify sync.</p><Link className="dm-btn" to="/app">View inventory</Link></section>}
  </main>;
}
