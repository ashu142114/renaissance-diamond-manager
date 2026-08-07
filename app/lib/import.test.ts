import { describe, expect, it } from "vitest";
import { parseDiamondFile } from "./import.server";

describe("diamond import", () => {
  it("parses a valid CSV row", async () => {
    const csv = "certificate,diamond_type,shape,carat,color,clarity,cut,lab,price,stock,status\nLG1,LAB_GROWN,Round,1,F,VS1,Excellent,IGI,900,1,ACTIVE\n";
    const result = await parseDiamondFile(new File([csv], "diamonds.csv", { type: "text/csv" }));
    expect(result.errors).toHaveLength(0); expect(result.rows[0].certificate).toBe("LG1");
  });
  it("reports duplicate certificates in the same file", async () => {
    const row = "LG1,LAB_GROWN,Round,1,F,VS1,Excellent,IGI,900,1,ACTIVE\n";
    const csv = "certificate,diamond_type,shape,carat,color,clarity,cut,lab,price,stock,status\n" + row + row;
    const result = await parseDiamondFile(new File([csv], "diamonds.csv"));
    expect(result.errors.some((error) => error.message.includes("Duplicate"))).toBe(true);
  });
});
