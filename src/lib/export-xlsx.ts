import * as XLSX from "xlsx";
import type { Product, Spec, SpecField, Competitor } from "./types";
import { formatPrice } from "./format";

type ProductWithCompetitor = Product & {
  competitor: Pick<Competitor, "id" | "name" | "logo_url">;
};

export function exportToXlsx(
  products: ProductWithCompetitor[],
  specsMap: Map<string, Map<string, Spec>>,
  fields: SpecField[],
  category: string,
  displayBrands?: Map<string, string>
) {
  const headers = ["항목", ...products.map((p) => `${p.competitor.name}\n${p.name}`)];

  const rows: string[][] = [];

  rows.push(["제품명", ...products.map((p) => p.name)]);
  rows.push(["모델번호", ...products.map((p) => p.model_number || "-")]);
  rows.push(["출시국가", ...products.map((p) => p.country || "-")]);
  rows.push(["업체명", ...products.map((p) => displayBrands?.get(p.id) || p.competitor.name)]);
  rows.push(["판매가격", ...products.map((p) => formatPrice(p.price, p.currency))]);

  for (const field of fields.filter((f) => f.is_visible)) {
    const row = [field.field_label];
    for (const product of products) {
      const spec = specsMap.get(product.id)?.get(field.field_key);
      const value = spec ? spec.value : "-";
      const suffix = spec?.source === "researched" ? " *" : "";
      row.push(value + suffix);
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, category);
  XLSX.writeFile(wb, `CompetitorWatch_${category}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
