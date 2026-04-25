import React from "react";
import CrudPanel from "./CrudPanel";

export default function TestimonialsPanel({ token }) {
  const fields = [
    { name: "id", label: "ID (slug)", required: true, placeholder: "e.g. t-25" },
    { name: "author", label: "Author name", required: true, placeholder: "Customer's name" },
    {
      name: "content",
      label: "Testimonial",
      type: "textarea",
      fullWidth: true,
      required: true,
      placeholder: "What did they share with you?",
    },
    { name: "rating", label: "Rating (1–5)", type: "number", placeholder: "5" },
    {
      name: "source",
      label: "Source (e.g. Google, WhatsApp, Exly)",
      placeholder: "Akashic · WhatsApp",
    },
  ];

  const newItemTemplate = {
    id: "",
    author: "",
    content: "",
    rating: 5,
    source: "",
  };

  const renderRow = (t) => (
    <div className="min-w-0">
      <div className="font-medium text-ink-plum">{t.author}</div>
      <div className="text-xs text-ink-plum/60 mt-0.5 line-clamp-2 italic">
        "{t.content}"
      </div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-peach-deep mt-1">
        {t.source || "—"} · {t.rating} ★
      </div>
    </div>
  );

  return (
    <CrudPanel
      token={token}
      title="Testimonials"
      description="Manage the client feedback shown on the homepage."
      endpoint="/admin/testimonials"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="testimonials-admin"
    />
  );
}
