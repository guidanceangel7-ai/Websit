import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACCENTS = [
  { value: "from-[#F4C6D6] to-[#FBE4D5]", label: "Blush → Peach" },
  { value: "from-[#C8B6E2] to-[#E6DDF1]", label: "Lilac → Lavender" },
  { value: "from-[#EBB99A] to-[#F4C6D6]", label: "Peach → Blush" },
  { value: "from-[#9B8AC4] to-[#C8B6E2]", label: "Lavender → Lilac" },
  { value: "from-[#6B5B95] to-[#9B8AC4]", label: "Deep → Soft Lavender" },
];

const slugifyTag = (raw) => {
  if (!raw) return "";
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_/ ]+/g, "")
    .replace(/[\s_/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
};

const EMPTY_CAT = {
  id: "",
  name: "",
  description: "",
  accent: "from-[#F4C6D6] to-[#FBE4D5]",
  icon: "sparkles",
  order: 100,
};

const EMPTY_VARIANT = {
  id: "",
  name: "",
  blurb: "",
  price_inr: "",
  badge: "",
  in_stock: true,
  order: 1,
  tags: [],
};

export default function ProductCategoriesPanel({ token }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  // Category edit state
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [catEditing, setCatEditing] = useState(null);
  const [catSaving, setCatSaving] = useState(false);
  // Variant edit state
  const [varOpen, setVarOpen] = useState(false);
  const [varForm, setVarForm] = useState(EMPTY_VARIANT);
  const [varEditing, setVarEditing] = useState(null);
  const [varCatId, setVarCatId] = useState(null);
  const [varSaving, setVarSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        axios.get(`${API}/admin/product-categories`, auth),
        axios.get(`${API}/admin/products`, auth),
      ]);
      setCats(c.data || []);
      setProducts(p.data || []);
    } catch {
      toast.error("Could not load categories");
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line

  useEffect(() => {
    refresh();
  }, [refresh]);

  const productsForCat = (cid) =>
    products
      .filter((p) => p.product_category_id === cid)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  // ----- Category CRUD -----
  const startCreateCat = () => {
    setCatEditing(null);
    setCatForm(EMPTY_CAT);
    setCatOpen(true);
  };
  const startEditCat = (c) => {
    setCatEditing(c);
    setCatForm({ ...EMPTY_CAT, ...c });
    setCatOpen(true);
  };
  const submitCat = async (e) => {
    e?.preventDefault();
    if (!catForm.id || !catForm.name) {
      toast.error("ID and name are required");
      return;
    }
    setCatSaving(true);
    try {
      const payload = { ...catForm, order: parseInt(catForm.order || 100) };
      if (catEditing) {
        await axios.put(
          `${API}/admin/product-categories/${catEditing.id}`,
          payload,
          auth
        );
        toast.success("Category updated ✦");
      } else {
        await axios.post(`${API}/admin/product-categories`, payload, auth);
        toast.success("Category created ✦");
      }
      setCatOpen(false);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setCatSaving(false);
    }
  };
  const removeCat = async (c) => {
    const count = productsForCat(c.id).length;
    if (count > 0) {
      toast.error(
        `Cannot delete "${c.name}" — it still has ${count} variant${count > 1 ? "s" : ""}. Move or delete them first.`
      );
      return;
    }
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await axios.delete(`${API}/admin/product-categories/${c.id}`, auth);
      toast.success("Category deleted");
      refresh();
    } catch {
      toast.error("Could not delete");
    }
  };

  // ----- Variant CRUD (inline product create/edit under a category) -----
  const startCreateVariant = (catId) => {
    setVarEditing(null);
    setVarCatId(catId);
    const next = productsForCat(catId);
    setVarForm({
      ...EMPTY_VARIANT,
      id: `${catId}-${Date.now().toString(36)}`,
      order: next.length + 1,
    });
    setVarOpen(true);
  };
  const startEditVariant = (p) => {
    setVarEditing(p);
    setVarCatId(p.product_category_id);
    setVarForm({
      ...EMPTY_VARIANT,
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : [],
    });
    setVarOpen(true);
  };
  const submitVariant = async (e) => {
    e?.preventDefault();
    if (!varForm.id || !varForm.name) {
      toast.error("ID and name are required");
      return;
    }
    setVarSaving(true);
    try {
      const tags = Array.from(
        new Set((varForm.tags || []).map(slugifyTag).filter(Boolean))
      );
      const cat = cats.find((c) => c.id === varCatId);
      const payload = {
        id: varForm.id,
        name: varForm.name,
        blurb: varForm.blurb || "",
        price_inr: varForm.price_inr ? parseInt(varForm.price_inr) : null,
        badge: varForm.badge || null,
        image_url: varEditing?.image_url || null,
        images: varEditing?.images || [],
        accent: cat?.accent || "from-[#C8B6E2] to-[#E6DDF1]",
        in_stock: !!varForm.in_stock,
        order: parseInt(varForm.order || 1),
        product_category_id: varCatId,
        tags,
      };
      if (varEditing) {
        await axios.put(`${API}/admin/products/${varEditing.id}`, payload, auth);
        toast.success("Variant updated ✦");
      } else {
        await axios.post(`${API}/admin/products`, payload, auth);
        toast.success("Variant created ✦");
      }
      setVarOpen(false);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setVarSaving(false);
    }
  };
  const removeVariant = async (p) => {
    if (!window.confirm(`Delete variant "${p.name}"?`)) return;
    try {
      await axios.delete(`${API}/admin/products/${p.id}`, auth);
      toast.success("Variant deleted");
      refresh();
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div data-testid="product-cats-admin" className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-ink-plum">Shop Categories</h2>
          <p className="text-sm text-ink-plum/60 mt-1">
            Group products into collections. Click a category to expand and
            add / edit its variants inline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            data-testid="cats-refresh"
            className="inline-flex items-center gap-2 rounded-full border border-peach/40 bg-white px-3 py-1.5 text-xs hover:bg-peach/10"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={startCreateCat}
            data-testid="cats-create"
            className="inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-4 py-2 text-sm hover:bg-lavender-deeper"
          >
            <Plus size={14} /> New Category
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl bg-white border border-peach/30 p-8 text-center text-ink-plum/60 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="animate-spin" size={16} /> Loading categories…
          </div>
        )}
        {!loading && cats.length === 0 && (
          <div className="rounded-2xl bg-white border border-peach/30 p-8 text-center text-ink-plum/60">
            No categories yet. Create your first one ✦
          </div>
        )}
        {cats.map((c) => {
          const variants = productsForCat(c.id);
          const isOpen = !!expanded[c.id];
          return (
            <div
              key={c.id}
              data-testid={`cat-row-${c.id}`}
              className="rounded-2xl bg-white border border-peach/30 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded({ ...expanded, [c.id]: !isOpen })
                  }
                  data-testid={`cat-toggle-${c.id}`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-peach/15 text-ink-plum/60"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.accent} shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-plum truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-ink-plum/60 truncate">
                    <span className="font-mono">{c.id}</span>
                    {c.description &&
                      ` · ${c.description.slice(0, 60)}${c.description.length > 60 ? "…" : ""}`}
                  </div>
                </div>
                <span className="text-[11px] tracking-[0.22em] uppercase text-peach-deep font-semibold">
                  {variants.length} variant{variants.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => startCreateVariant(c.id)}
                  data-testid={`cat-add-variant-${c.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-peach/20 hover:bg-peach/40 text-peach-deep px-3 py-1.5 text-xs font-semibold"
                  title="Add a variant under this category"
                >
                  <Plus size={12} /> Variant
                </button>
                <button
                  onClick={() => startEditCat(c)}
                  data-testid={`cat-edit-${c.id}`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-peach/15 text-ink-plum/60"
                  title="Edit category"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => removeCat(c)}
                  data-testid={`cat-delete-${c.id}`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-red-50 text-red-500"
                  title="Delete category"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-peach/30 bg-ivory-deep/30 p-4 space-y-2">
                  {variants.length === 0 ? (
                    <div className="text-center py-6 text-sm text-ink-plum/60 italic">
                      No variants yet. Add the first one with the "Variant" button above ✦
                    </div>
                  ) : (
                    variants.map((p) => (
                      <div
                        key={p.id}
                        data-testid={`variant-row-${p.id}`}
                        className="flex items-center gap-3 bg-white rounded-xl border border-peach/20 px-3 py-2"
                      >
                        <div className="w-10 h-10 rounded-lg bg-ivory-deep/60 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={14} className="text-peach/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink-plum truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-ink-plum/60 truncate flex flex-wrap gap-1.5 items-center">
                            {p.price_inr ? (
                              <span className="font-mono">
                                ₹{p.price_inr.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="italic">No price</span>
                            )}
                            {!p.in_stock && (
                              <span className="text-[10px] uppercase tracking-wider bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                                Sold out
                              </span>
                            )}
                            {(p.tags || []).slice(0, 3).map((t) => (
                              <span
                                key={`${p.id}-t-${t}`}
                                className="text-[10px] bg-peach/15 text-peach-deep px-1.5 py-0.5 rounded-full"
                              >
                                ✦ {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => startEditVariant(p)}
                          data-testid={`variant-edit-${p.id}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-peach/15 text-ink-plum/60"
                          title="Edit variant"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => removeVariant(p)}
                          data-testid={`variant-delete-${p.id}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-red-50 text-red-500"
                          title="Delete variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category dialog */}
      {catOpen && (
        <Modal onClose={() => setCatOpen(false)} title={catEditing ? "Edit Category" : "New Category"}>
          <form onSubmit={submitCat} className="space-y-4">
            <Field label="Category ID (slug) *">
              <input
                value={catForm.id}
                onChange={(e) => setCatForm({ ...catForm, id: e.target.value })}
                disabled={!!catEditing}
                placeholder="e.g. candles, crystals, oils"
                className="form-input"
                required
              />
            </Field>
            <Field label="Display name *">
              <input
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="form-input"
                required
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={catForm.description}
                onChange={(e) =>
                  setCatForm({ ...catForm, description: e.target.value })
                }
                className="form-input"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Accent gradient">
                <select
                  value={catForm.accent}
                  onChange={(e) =>
                    setCatForm({ ...catForm, accent: e.target.value })
                  }
                  className="form-input"
                >
                  {ACCENTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  value={catForm.order}
                  onChange={(e) =>
                    setCatForm({ ...catForm, order: e.target.value })
                  }
                  className="form-input"
                />
              </Field>
            </div>
            <ModalActions onCancel={() => setCatOpen(false)} saving={catSaving} />
          </form>
        </Modal>
      )}

      {/* Variant dialog */}
      {varOpen && (
        <Modal
          onClose={() => setVarOpen(false)}
          title={
            varEditing
              ? `Edit "${varEditing.name}"`
              : `Add variant under ${cats.find((c) => c.id === varCatId)?.name || ""}`
          }
        >
          <form onSubmit={submitVariant} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Variant ID (slug) *">
                <input
                  value={varForm.id}
                  onChange={(e) => setVarForm({ ...varForm, id: e.target.value })}
                  disabled={!!varEditing}
                  placeholder="e.g. candle-money"
                  className="form-input"
                  required
                />
              </Field>
              <Field label="Display name *">
                <input
                  value={varForm.name}
                  onChange={(e) => setVarForm({ ...varForm, name: e.target.value })}
                  className="form-input"
                  required
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                rows={2}
                value={varForm.blurb}
                onChange={(e) => setVarForm({ ...varForm, blurb: e.target.value })}
                className="form-input"
              />
            </Field>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Price (₹)">
                <input
                  type="number"
                  value={varForm.price_inr}
                  onChange={(e) =>
                    setVarForm({ ...varForm, price_inr: e.target.value })
                  }
                  className="form-input"
                />
              </Field>
              <Field label="Badge (optional)">
                <input
                  value={varForm.badge || ""}
                  onChange={(e) => setVarForm({ ...varForm, badge: e.target.value })}
                  placeholder="e.g. Bestseller"
                  className="form-input"
                />
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  value={varForm.order}
                  onChange={(e) => setVarForm({ ...varForm, order: e.target.value })}
                  className="form-input"
                />
              </Field>
            </div>
            <Field label="Tags">
              <div className="rounded-xl border-2 border-peach/30 bg-white px-2.5 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-lavender-deep">
                {(varForm.tags || []).map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-lavender-deep/10 text-lavender-deep px-2.5 py-0.5 text-[11px] font-bold tracking-wide"
                  >
                    ✦ {t}
                    <button
                      type="button"
                      onClick={() =>
                        setVarForm({
                          ...varForm,
                          tags: varForm.tags.filter((_, idx) => idx !== i),
                        })
                      }
                      className="text-lavender-deep/70 hover:text-lavender-deep"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={
                    (varForm.tags || []).length === 0
                      ? "money, love, protection…"
                      : "Add tag…"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const slug = slugifyTag(e.target.value);
                      if (slug && !(varForm.tags || []).includes(slug)) {
                        setVarForm({
                          ...varForm,
                          tags: [...(varForm.tags || []), slug],
                        });
                      }
                      e.target.value = "";
                    }
                  }}
                  onBlur={(e) => {
                    const slug = slugifyTag(e.target.value);
                    if (slug && !(varForm.tags || []).includes(slug)) {
                      setVarForm({
                        ...varForm,
                        tags: [...(varForm.tags || []), slug],
                      });
                    }
                    e.target.value = "";
                  }}
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
                />
              </div>
            </Field>
            <label className="inline-flex items-center gap-2 text-sm text-ink-plum">
              <input
                type="checkbox"
                checked={!!varForm.in_stock}
                onChange={(e) =>
                  setVarForm({ ...varForm, in_stock: e.target.checked })
                }
                className="w-4 h-4"
              />
              In stock
            </label>
            <p className="text-[11px] text-ink-plum/50">
              Tip: To add product images, save first then open this variant from
              the <strong>Shop</strong> tab — there you can upload up to 5 images.
            </p>
            <ModalActions onCancel={() => setVarOpen(false)} saving={varSaving} />
          </form>
        </Modal>
      )}

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 2px solid rgba(235, 185, 154, 0.3);
          background: white;
          padding: 0.5rem 0.75rem;
          color: #3A2E5D;
          outline: none;
        }
        .form-input:focus { border-color: #6B5B95; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center bg-ink-plum/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl border border-peach/30 shadow-soft my-8"
      >
        <div className="px-6 py-4 border-b border-peach/30 flex items-center justify-between bg-ivory-deep/40 rounded-t-3xl">
          <h3 className="font-display text-xl text-ink-plum">{title}</h3>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-peach/20 text-ink-plum/60"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, saving }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-peach/20">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-peach/40 bg-white px-5 py-2 text-sm hover:bg-peach/10"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-lavender-deep text-ivory px-5 py-2 text-sm hover:bg-lavender-deeper disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
