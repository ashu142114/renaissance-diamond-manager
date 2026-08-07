import { describe, expect, it } from "vitest";
import { diamondSchema, normalizedCertificate } from "./diamond";

const valid = { certificate: "LG 1001", type: "LAB_GROWN", shape: "Round", carat: 1, color: "F", clarity: "VS1", cut: "Excellent", lab: "IGI", price: 999, stock: 1, status: "ACTIVE" };

describe("diamond validation", () => {
  it("accepts a complete diamond", () => expect(diamondSchema.safeParse(valid).success).toBe(true));
  it("rejects invalid URLs", () => expect(diamondSchema.safeParse({ ...valid, imageUrl: "not-a-url" }).success).toBe(false));
  it("normalizes certificates", () => expect(normalizedCertificate(" lg 10 01 ")).toBe("LG1001"));
});
