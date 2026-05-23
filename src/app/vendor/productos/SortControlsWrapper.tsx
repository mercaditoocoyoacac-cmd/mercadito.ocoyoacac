"use client";

import { SortControls } from "@/components/storefront/SortControls";

export function VendorSortControlsWrapper({
  mode,
  dir,
  isManual,
}: {
  mode: "date" | "name" | "manual";
  dir: "asc" | "desc";
  isManual: boolean;
}) {
  const handleChangeSort = async (newMode: "date" | "name" | "manual", newDir?: "asc" | "desc") => {
    if (newMode === "manual") return;
    const dirParam = newDir || "desc";
    const res = await fetch(`/api/vendor/products?sort=${newMode}&dir=${dirParam}`);
    const data = await res.json();
    if (!data.ok || !data.products?.length) return;

    const orders = data.products.map((p: { id: string }, i: number) => ({
      id: p.id,
      sortOrder: i + 1,
    }));

    await fetch("/api/vendor/products/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
  };

  return <SortControls mode={mode} dir={dir} isManual={isManual} onChangeSort={handleChangeSort} />;
}
