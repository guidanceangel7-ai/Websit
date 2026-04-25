import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Generic CRUD panel with a list view and modal form.
 * fields: [{ name, label, type, options?, required?, placeholder?, fullWidth? }]
 */
export default function CrudPanel({
  token,
  title,
  description,
  endpoint, // e.g. "/admin/products"
  fields,
  renderRow, // (item) => JSX cells
  newItemTemplate,
  testid,
}) {
  const headers = { Authorization: `Bearer ${token}` };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}${endpoint}`, { headers });
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      toast.error("Could not load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...newItemTemplate });
    setOpen(true);
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({ ...newItemTemplate, ...item });
    setOpen(true);
  };

  const submit = async (e) => {
    e?.preventDefault();
    // basic validation
    for (const f of fields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      // Coerce number fields
      const payload = { ...form };
      for (const f of fields) {
        if (f.type === "number" && payload[f.name] !== "" && payload[f.name] != null) {
          payload[f.name] = parseInt(payload[f.name]);
        }
        if (f.type === "checkbox") payload[f.name] = !!payload[f.name];
      }
      if (editing) {
        const id = editing.id;
        await axios.put(`${API}${endpoint}/${id}`, payload, { headers });
        toast.success("Updated ✦");
      } else {
        await axios.post(`${API}${endpoint}`, payload, { headers });
        toast.success("Created ✦");
      }
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name || item.author || item.id}"?`)) return;
    try {
      await axios.delete(`${API}${endpoint}/${item.id}`, { headers });
      toast.success("Deleted");
      refresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="rounded-3xl bg-white/90 border border-peach/30 shadow-soft overflow-hidden">
      <div className="px-6 py-5 border-b border-peach/20 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink-plum">{title}</h2>
          {description && (
            <p className="text-sm text-ink-plum/60 mt-1">{description}</p>
          )}
        </div>
        <button
          data-testid={`${testid}-create-btn`}
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-5 py-2.5 text-sm hover:bg-lavender-deeper"
        >
          <Plus size={14} /> Add new
        </button>
      </div>

      <div className="p-2 sm:p-3">
        {loading ? (
          <div className="p-8 inline-flex items-center gap-2 text-ink-plum/60">
            <Loader2 className="animate-spin" size={14} /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-ink-plum/60 text-sm">
            Nothing here yet — click "Add new" to create one.
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`${testid}-row-${item.id}`}
                className="rounded-2xl border border-peach/25 bg-ivory/50 px-4 py-3 flex items-center justify-between gap-3 hover:bg-white transition"
              >
                <div className="min-w-0 flex-1">{renderRow(item)}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    data-testid={`${testid}-edit-${item.id}`}
                    onClick={() => startEdit(item)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40 transition"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    data-testid={`${testid}-delete-${item.id}`}
                    onClick={() => remove(item)}
                    className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-testid={`${testid}-form-dialog`}
          className="!bg-[#FFFFFF] max-w-2xl rounded-3xl p-0 overflow-hidden"
        >
          <div className="bg-gradient-to-br from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-white">
                {editing ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`}
              </DialogTitle>
              <DialogDescription className="text-white/85 text-xs">
                Fill in the details below
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={submit} className="px-6 py-5 max-h-[60vh] overflow-y-auto bg-white">
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((f) => {
                const colSpan = f.fullWidth ? "sm:col-span-2" : "";
                if (f.type === "checkbox") {
                  return (
                    <label
                      key={f.name}
                      className={`${colSpan} flex items-center gap-3 mt-2`}
                    >
                      <input
                        data-testid={`${testid}-input-${f.name}`}
                        type="checkbox"
                        checked={!!form[f.name]}
                        onChange={(e) =>
                          setForm({ ...form, [f.name]: e.target.checked })
                        }
                        className="w-4 h-4 accent-lavender-deep"
                      />
                      <span className="text-sm text-ink-plum">{f.label}</span>
                    </label>
                  );
                }
                if (f.type === "select") {
                  return (
                    <div key={f.name} className={colSpan}>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <select
                        data-testid={`${testid}-input-${f.name}`}
                        value={form[f.name] ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, [f.name]: e.target.value })
                        }
                        className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                      >
                        <option value="">— select —</option>
                        {(f.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <div key={f.name} className={colSpan}>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <textarea
                        data-testid={`${testid}-input-${f.name}`}
                        rows={3}
                        value={form[f.name] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) =>
                          setForm({ ...form, [f.name]: e.target.value })
                        }
                        className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none placeholder:text-ink-plum/40"
                      />
                    </div>
                  );
                }
                return (
                  <div key={f.name} className={colSpan}>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      data-testid={`${testid}-input-${f.name}`}
                      type={f.type || "text"}
                      value={form[f.name] ?? ""}
                      placeholder={f.placeholder}
                      disabled={f.name === "id" && editing}
                      onChange={(e) =>
                        setForm({ ...form, [f.name]: e.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none placeholder:text-ink-plum/40 disabled:opacity-60"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <button
                type="submit"
                data-testid={`${testid}-form-submit`}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] text-white px-6 py-2.5 text-sm font-medium hover:from-[#5A4C7E] hover:to-[#6B5B95] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                {editing ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
