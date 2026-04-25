import React, { useEffect, useState } from "react";
import axios from "axios";
import CrudPanel from "./CrudPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ServicesPanel({ token }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios
      .get(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setCategories(r.data || []))
      .catch(() => setCategories([]));
  }, [token]);

  const fields = [
    { name: "id", label: "Service ID (slug, lowercase, no spaces)", required: true, placeholder: "e.g. ak-90" },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "name", label: "Service name", required: true, placeholder: "e.g. 90-min Akashic Reading" },
    { name: "duration_minutes", label: "Duration (minutes, blank for voice notes)", type: "number", placeholder: "e.g. 30" },
    { name: "price_inr", label: "Price (₹)", type: "number", required: true, placeholder: "e.g. 4000" },
    { name: "is_voice_note", label: "Voice note (no live call needed)", type: "checkbox" },
    {
      name: "variant",
      label: "Variant type",
      type: "select",
      options: [
        { value: "call", label: "Live call" },
        { value: "voice_note", label: "Voice note" },
        { value: "program", label: "Multi-day program" },
      ],
    },
    { name: "program_days", label: "Program days (only for healing programs)", type: "number" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      fullWidth: true,
      placeholder: "What does this service include?",
    },
  ];

  const newItemTemplate = {
    id: "",
    category: "",
    name: "",
    duration_minutes: "",
    price_inr: "",
    description: "",
    is_voice_note: false,
    variant: "call",
    program_days: "",
  };

  const renderRow = (s) => (
    <div className="flex items-center gap-4 min-w-0">
      <div
        className="w-12 h-12 rounded-full bg-gradient-to-br from-lilac to-peach flex items-center justify-center text-white text-xs font-bold shrink-0"
      >
        ₹{Math.round(s.price_inr / 1000)}k
      </div>
      <div className="min-w-0">
        <div className="font-medium text-ink-plum truncate">{s.name}</div>
        <div className="text-xs text-ink-plum/60 truncate">
          <span className="font-mono">{s.id}</span> ·{" "}
          <span className="text-peach-deep">{s.category}</span> ·{" "}
          {s.is_voice_note ? "voice note" : `${s.duration_minutes} min`} ·{" "}
          ₹{s.price_inr?.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );

  return (
    <CrudPanel
      token={token}
      title="Services"
      description="Manage all readings, voice notes and programs your customers can book."
      endpoint="/admin/services"
      fields={fields}
      renderRow={renderRow}
      newItemTemplate={newItemTemplate}
      testid="services-admin"
    />
  );
}
