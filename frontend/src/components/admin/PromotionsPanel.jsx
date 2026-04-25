import React from "react";
import CrudPanel from "./CrudPanel";

const SCOPE = [
  { value: "site_wide", label: "Site-wide (services + products)" },
  { value: "services_only", label: "Readings only" },
  { value: "products_only", label: "Sacred Shop only" },
  { value: "specific", label: "Specific items (use target_ids)" },
];

const TYPE = [
  { value: "percent", label: "Percent (%)" },
  { value: "flat", label: "Flat ₹ off" },
];

export default function PromotionsPanel({ token }) {
  const fields = [
    { name: "id", label: "Promotion ID (slug)", required: true, placeholder: "e.g. summer-soul-20" },
    { name: "title", label: "Title shown on banner", required: true, placeholder: "e.g. Summer Soul Sale" },
    { name: "banner_text", label: "Banner copy (optional, overrides default)", placeholder: "e.g. ✦ 20% off all readings — code SOUL20" },
    { name: "description", label: "Internal description (admin only)", type: "textarea" },
    { name: "code", label: "Coupon code (blank = auto-applied, no code needed)", placeholder: "e.g. SOUL20" },
    { name: "discount_type", label: "Discount type", type: "select", options: TYPE, required: true },
    { name: "discount_value", label: "Discount value (% or ₹)", type: "number", required: true, placeholder: "20 or 500" },
    { name: "scope", label: "Applies to", type: "select", options: SCOPE, required: true },
    { name: "min_order_inr", label: "Minimum order (₹) — 0 for none", type: "number" },
    { name: "max_uses", label: "Max uses — 0 for unlimited", type: "number" },
    { name: "starts_at", label: "Starts at (ISO datetime, optional)", placeholder: "2026-05-01T00:00:00Z" },
    { name: "ends_at", label: "Ends at (ISO datetime, optional)", placeholder: "2026-05-31T23:59:59Z" },
    { name: "active", label: "Active", type: "checkbox" },
    { name: "show_banner", label: "Show banner on website", type: "checkbox" },
  ];

  const newItemTemplate = {
    id: "",
    title: "",
    banner_text: "",
    description: "",
    code: "",
    discount_type: "percent",
    discount_value: 10,
    scope: "site_wide",
    min_order_inr: 0,
    max_uses: 0,
    uses: 0,
    starts_at: "",
    ends_at: "",
    active: true,
    show_banner: true,
    target_ids: [],
  };

  const renderRow = (p) => {
    const value =
      p.discount_type === "percent"
        ? `${p.discount_value}% off`
        : `₹${Number(p.discount_value).toLocaleString("en-IN")} off`;
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium text-ink-plum truncate">{p.title}</div>
          {p.active ? (
            <span className="text-[10px] tracking-[0.2em] uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              Live
            </span>
          ) : (
            <span className="text-[10px] tracking-[0.2em] uppercase bg-ivory-deep text-ink-plum/60 px-2 py-0.5 rounded-full font-bold">
              Off
            </span>
          )}
          {p.show_banner && (
            <span className="text-[10px] tracking-[0.2em] uppercase bg-peach/30 text-ink-plum px-2 py-0.5 rounded-full font-bold">
              Banner
            </span>
          )}
        </div>
        <div className="text-xs text-ink-plum/60 mt-0.5">
          <span className="font-mono">{p.id}</span> ·{" "}
          {p.code ? (
            <span className="font-mono text-peach-deep font-bold">{p.code}</span>
          ) : (
            <span className="italic">auto-applied</span>
          )}{" "}
          · {value} · {(p.scope || "").replace("_", " ")}
          {p.uses > 0 && ` · ${p.uses}${p.max_uses ? `/${p.max_uses}` : ""} used`}
        </div>
      </div>
    );
  };

  return (
    <CrudPanel
      token={token}
      title="Promotions & Coupons"
      description="Create site-wide offers, scoped discounts, and coupon codes. Active offers auto-show as a banner on the website."
      endpoint="/admin/promotions"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="promotions-admin"
    />
  );
}
