import React from "react";
import CrudPanel from "./CrudPanel";

const ACCENTS = [
  { value: "from-[#C8B6E2] to-[#E6DDF1]", label: "Lilac → Lavender" },
  { value: "from-[#F4C6D6] to-[#FBE4D5]", label: "Blush → Peach" },
  { value: "from-[#EBB99A] to-[#F4C6D6]", label: "Peach → Blush" },
  { value: "from-[#9B8AC4] to-[#C8B6E2]", label: "Lavender → Lilac" },
  { value: "from-[#6B5B95] to-[#9B8AC4]", label: "Deep → Soft Lavender" },
];

export default function ProductsPanel({ token }) {
  const fields = [
    { name: "id", label: "Product ID (slug)", required: true, placeholder: "e.g. p-rosequartz" },
    { name: "name", label: "Product name", required: true, placeholder: "e.g. Rose Quartz Heart" },
    { name: "blurb", label: "Short blurb", type: "textarea", fullWidth: true, placeholder: "Sales copy 1-2 lines" },
    { name: "price_inr", label: "Price (₹) — optional, leave blank to hide", type: "number" },
    { name: "badge", label: "Badge (e.g. Bestseller / New)", placeholder: "Most Loved" },
    { name: "image_url", label: "Image URL (optional — uses gradient if blank)", placeholder: "https://..." },
    { name: "accent", label: "Background gradient (used when no image)", type: "select", options: ACCENTS },
    { name: "shop_url", label: "Buy/redirect URL", placeholder: "https://guidanceangel7.exlyapp.com/..." },
    { name: "order", label: "Display order", type: "number" },
  ];

  const newItemTemplate = {
    id: "",
    name: "",
    blurb: "",
    price_inr: "",
    badge: "",
    image_url: "",
    accent: "from-[#C8B6E2] to-[#E6DDF1]",
    shop_url: "",
    order: 100,
  };

  const renderRow = (p) => (
    <div className="flex items-center gap-3 min-w-0">
      {p.image_url ? (
        <img
          src={p.image_url}
          alt={p.name}
          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-peach/30"
        />
      ) : (
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.accent} shrink-0`}
        />
      )}
      <div className="min-w-0">
        <div className="font-medium text-ink-plum truncate">
          {p.name}
          {p.badge && (
            <span className="ml-2 text-[10px] tracking-[0.2em] uppercase bg-peach/30 text-ink-plum px-2 py-0.5 rounded-full">
              {p.badge}
            </span>
          )}
        </div>
        <div className="text-xs text-ink-plum/60 truncate">
          <span className="font-mono">{p.id}</span>
          {p.price_inr ? ` · ₹${p.price_inr.toLocaleString("en-IN")}` : ""} ·{" "}
          {p.blurb?.slice(0, 60)}
          {p.blurb?.length > 60 ? "…" : ""}
        </div>
      </div>
    </div>
  );

  return (
    <CrudPanel
      token={token}
      title="Sacred Shop Products"
      description="Manage your wellness products shown on the public Shop section."
      endpoint="/admin/products"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="products-admin"
    />
  );
}
