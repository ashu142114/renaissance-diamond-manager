import type { Diamond } from "@prisma/client";

type Props = {
  diamond?: Diamond | null;
  errors?: Record<string, string>;
  submitLabel?: string;
};

const value = (diamond: Diamond | null | undefined, key: keyof Diamond, fallback = "") =>
  diamond?.[key] == null ? fallback : String(diamond[key]);

export function DiamondForm({ diamond, errors = {}, submitLabel = "Save diamond" }: Props) {
  const field = (name: string, label: string, type = "text", required = false, extra: Record<string, string | number> = {}) => (
    <label className="dm-label">
      {label}{required ? " *" : ""}
      <input className="dm-input" name={name} type={type} required={required} defaultValue={value(diamond, name as keyof Diamond, String(extra.defaultValue ?? ""))} {...extra} />
      {errors[name] && <span className="dm-error">{errors[name]}</span>}
    </label>
  );

  return (
    <div className="dm-form">
      <h2 className="dm-section-title">Classification</h2>
      {field("certificate", "Certificate number", "text", true)}
      <label className="dm-label">Diamond type *
        <select className="dm-select" name="type" required defaultValue={value(diamond, "type", "LAB_GROWN")}>
          <option value="LAB_GROWN">Lab-Grown</option><option value="NATURAL">Natural</option>
        </select>{errors.type && <span className="dm-error">{errors.type}</span>}
      </label>
      {field("sku", "SKU")}
      {field("shape", "Shape", "text", true)}
      {field("carat", "Carat", "number", true, { step: "0.001", min: "0.001" })}
      {field("lab", "Grading lab", "text", true)}

      <h2 className="dm-section-title">Grading</h2>
      {field("color", "Color", "text", true)}
      {field("clarity", "Clarity", "text", true)}
      {field("cut", "Cut", "text", true)}
      {field("polish", "Polish")}
      {field("symmetry", "Symmetry")}
      {field("fluorescence", "Fluorescence")}

      <h2 className="dm-section-title">Commerce</h2>
      {field("price", "Price", "number", true, { step: "0.01", min: "0", defaultValue: diamond ? Number(diamond.priceCents) / 100 : "" })}
      {field("stock", "Stock", "number", true, { step: "1", min: "0", defaultValue: 1 })}
      <label className="dm-label">Status *
        <select className="dm-select" name="status" required defaultValue={value(diamond, "status", "ACTIVE")}>
          <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SOLD">Sold</option>
        </select>
      </label>

      <h2 className="dm-section-title">Media</h2>
      {field("imageUrl", "Image URL", "url")}
      {field("videoUrl", "Video URL", "url")}
      {field("reportUrl", "Certificate / report URL", "url")}
      {errors.form && <p className="dm-error dm-span-3">{errors.form}</p>}
      <div className="dm-footer-actions">
        <a className="dm-btn" href="/app">Cancel</a>
        <button className="dm-btn dm-btn--primary" type="submit">{submitLabel}</button>
      </div>
    </div>
  );
}
