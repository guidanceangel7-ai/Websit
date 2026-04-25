import React from "react";
import CrudPanel from "./CrudPanel";

const ICONS = [
  { value: "stars", label: "Stars" },
  { value: "book", label: "Book" },
  { value: "sparkles", label: "Sparkles" },
  { value: "calendar", label: "Calendar" },
  { value: "heart", label: "Heart" },
  { value: "headphones", label: "Headphones" },
];

export default function CategoriesPanel({ token }) {
  const fields = [
    { name: "id", label: "Category ID (slug)", required: true, placeholder: "e.g. astro_reading" },
    { name: "name", label: "Display name", required: true, placeholder: "e.g. Astrology Reading" },
    { name: "tagline", label: "Tagline (1 line)", placeholder: "Short hook for the card" },
    { name: "description", label: "Description", type: "textarea", fullWidth: true },
    { name: "icon", label: "Icon", type: "select", options: ICONS },
    { name: "order", label: "Display order (lower = first)", type: "number", placeholder: "1, 2, 3…" },
  ];

  const newItemTemplate = {
    id: "",
    name: "",
    tagline: "",
    description: "",
    icon: "stars",
    order: 100,
  };

  const renderRow = (c) => (
    <div className="flex items-center gap-3 min-w-0">
      <div className="text-xs uppercase tracking-[0.2em] text-peach-deep w-6 text-right shrink-0">
        #{c.order ?? "—"}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-ink-plum truncate">{c.name}</div>
        <div className="text-xs text-ink-plum/60 truncate">
          <span className="font-mono">{c.id}</span> · {c.tagline || "—"}
        </div>
      </div>
    </div>
  );

  return (
    <CrudPanel
      token={token}
      title="Categories"
      description="Organise your services into categories shown on the website and booking flow."
      endpoint="/admin/categories"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="categories-admin"
    />
  );
}
