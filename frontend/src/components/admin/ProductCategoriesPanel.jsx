import React from "react";
import CrudPanel from "./CrudPanel";

const ACCENTS = [
  { value: "from-[#F4C6D6] to-[#FBE4D5]", label: "Blush → Peach" },
  { value: "from-[#C8B6E2] to-[#E6DDF1]", label: "Lilac → Lavender" },
  { value: "from-[#EBB99A] to-[#F4C6D6]", label: "Peach → Blush" },
  { value: "from-[#9B8AC4] to-[#C8B6E2]", label: "Lavender → Lilac" },
  { value: "from-[#6B5B95] to-[#9B8AC4]", label: "Deep → Soft Lavender" },
];

export default function ProductCategoriesPanel({ token }) {
  const fields = [
    {
      name: "id",
      label: "Category ID (slug)",
      required: true,
      placeholder: "e.g. candles, crystals, oils",
    },
    {
      name: "name",
      label: "Display name",
      required: true,
      placeholder: "e.g. Intention Candles",
    },
    {
      name: "description",
      label: "Description shown on the shop",
      type: "textarea",
      fullWidth: true,
      placeholder: "What's this collection about?",
    },
    {
      name: "accent",
      label: "Accent gradient",
      type: "select",
      options: ACCENTS,
    },
    {
      name: "order",
      label: "Display order (lower = first)",
      type: "number",
    },
  ];

  const newItemTemplate = {
    id: "",
    name: "",
    description: "",
    accent: "from-[#F4C6D6] to-[#FBE4D5]",
    icon: "sparkles",
    order: 100,
  };

  const renderRow = (c) => (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.accent} shrink-0`} />
      <div className="min-w-0">
        <div className="font-medium text-ink-plum truncate">{c.name}</div>
        <div className="text-xs text-ink-plum/60 truncate">
          <span className="font-mono">{c.id}</span>
          {c.description ? ` · ${c.description.slice(0, 80)}${c.description.length > 80 ? "…" : ""}` : ""}
        </div>
      </div>
    </div>
  );

  return (
    <CrudPanel
      token={token}
      title="Shop Categories"
      description="Group products into collections (e.g. Candles → Money / Love / Protection)."
      endpoint="/admin/product-categories"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="product-cats-admin"
    />
  );
}
