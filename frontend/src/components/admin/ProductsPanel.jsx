import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACCENTS = [
  { value: "from-[#C8B6E2] to-[#E6DDF1]", label: "Lilac" },
  { value: "from-[#F4C6D6] to-[#FBE4D5]", label: "Blush" },
  { value: "from-[#EBB99A] to-[#F4C6D6]", label: "Peach" },
  { value: "from-[#9B8AC4] to-[#C8B6E2]", label: "Lavender" },
  { value: "from-[#6B5B95] to-[#9B8AC4]", label: "Deep Lavender" },
];

const EMPTY = {
  id: "",
  name: "",
  blurb: "",
  price_inr: "",
  badge: "",
  image_url: "",
  accent: "from-[#C8B6E2] to-[#E6DDF1]",
  in_stock: true,
  shop_url: "",
  order: 100,
  product_category_id: "",
};

export default function ProductsPanel({ token }) {
  const headers = { Authorization: `Bearer ${token}` };
  const [products, setProducts] = useState([]);
  const [shopCategories, setShopCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        axios.get(`${API}/admin/products`, { headers }),
        axios.get(`${API}/admin/product-categories`, { headers }),
      ]);
      setProducts(r.data || []);
      setShopCategories(c.data || []);
    } catch {
      toast.error("Could not load products");
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
    setForm(EMPTY);
    setOpen(true);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ ...EMPTY, ...p });
    setOpen(true);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.id || !form.name) {
      toast.error("ID and name are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price_inr: form.price_inr ? parseInt(form.price_inr) : null,
        order: parseInt(form.order || 100),
        in_stock: !!form.in_stock,
        product_category_id: form.product_category_id || null,
      };
      if (editing) {
        await axios.put(`${API}/admin/products/${editing.id}`, payload, { headers });
        toast.success("Product updated ✦");
      } else {
        await axios.post(`${API}/admin/products`, payload, { headers });
        toast.success("Product created ✦");
      }
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await axios.delete(`${API}/admin/products/${p.id}`, { headers });
      toast.success("Deleted");
      refresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Read file as base64 data URI, then save (or stage if creating)
  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image too large (max 6 MB). Please compress.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUri = evt.target.result;
      // If editing existing, push to backend right away
      if (editing) {
        setUploading(true);
        try {
          await axios.post(
            `${API}/admin/products/${editing.id}/image`,
            { image_data: dataUri },
            { headers }
          );
          setForm((f) => ({ ...f, image_url: dataUri }));
          toast.success("Image uploaded ✦");
        } catch (e) {
          toast.error(e?.response?.data?.detail || "Upload failed");
        } finally {
          setUploading(false);
        }
      } else {
        // Stage in form, will be saved when product is created
        setForm((f) => ({ ...f, image_url: dataUri }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-3xl bg-white/90 border border-peach/30 shadow-soft overflow-hidden">
      <div className="px-6 py-5 border-b border-peach/20 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink-plum">Sacred Shop Products</h2>
          <p className="text-sm text-ink-plum/60 mt-1">
            Add products with images — sold directly through the website.
          </p>
        </div>
        <button
          data-testid="products-create-btn"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-5 py-2.5 text-sm hover:bg-lavender-deeper"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="p-10 inline-flex items-center gap-2 text-ink-plum/60">
          <Loader2 className="animate-spin" size={14} /> Loading…
        </div>
      ) : products.length === 0 ? (
        <div className="p-10 text-center text-ink-plum/60 text-sm">
          No products yet. Click "Add Product" to create your first one.
        </div>
      ) : (
        <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              data-testid={`product-row-${p.id}`}
              className="rounded-2xl border border-peach/30 bg-white overflow-hidden flex flex-col"
            >
              <div
                className={`relative aspect-[5/3] flex items-center justify-center ${p.image_url ? "" : `bg-gradient-to-br ${p.accent}`}`}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="font-display text-3xl text-white italic drop-shadow-[0_2px_8px_rgba(58,46,93,0.3)]">
                    {(p.name || "").split(" ")[0]}
                  </div>
                )}
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[9px] tracking-[0.22em] uppercase bg-white/90 text-ink-plum px-2.5 py-1 rounded-full font-bold">
                    {p.badge}
                  </span>
                )}
                {!p.in_stock && (
                  <span className="absolute top-3 right-3 text-[9px] tracking-[0.22em] uppercase bg-red-500 text-white px-2.5 py-1 rounded-full font-bold">
                    Sold out
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display text-base text-ink-plum truncate">{p.name}</div>
                  {p.price_inr && (
                    <div className="font-display text-lavender-deep">
                      ₹{p.price_inr.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
                <div className="text-xs text-ink-plum/60 mt-1 line-clamp-2">{p.blurb}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.product_category_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase bg-lavender-deep/10 text-lavender-deep px-2 py-0.5 rounded-full font-bold">
                      {shopCategories.find((c) => c.id === p.product_category_id)?.name || p.product_category_id}
                    </span>
                  ) : (
                    <span className="text-[10px] tracking-[0.2em] uppercase bg-peach/15 text-peach-deep px-2 py-0.5 rounded-full font-bold">
                      Uncategorised
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-ink-plum/50">{p.id}</span>
                  <div className="flex gap-1.5">
                    <button
                      data-testid={`product-edit-${p.id}`}
                      onClick={() => startEdit(p)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      data-testid={`product-delete-${p.id}`}
                      onClick={() => remove(p)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-testid="product-form-dialog"
          className="!bg-white max-w-3xl rounded-3xl p-0 overflow-hidden"
        >
          <div className="bg-gradient-to-br from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-white">
                {editing ? `Edit ${editing.name}` : "Add Product"}
              </DialogTitle>
              <DialogDescription className="text-white/85 text-xs">
                {editing
                  ? "Update product details. Image uploads save instantly."
                  : "Add a new product. Image uploads after the product is created."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={submit} className="px-6 py-5 max-h-[65vh] overflow-y-auto bg-white">
            <div className="grid sm:grid-cols-3 gap-5">
              {/* Image preview / upload */}
              <div className="sm:col-span-1">
                <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold mb-2">
                  Product image
                </label>
                <div
                  className={`relative aspect-square rounded-2xl border-2 border-dashed border-peach/40 overflow-hidden flex items-center justify-center ${form.image_url ? "" : `bg-gradient-to-br ${form.accent}`}`}
                >
                  {form.image_url ? (
                    <>
                      <img
                        src={form.image_url}
                        alt="preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_url: "" })}
                        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-ink-plum"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="text-white text-center px-4">
                      <Upload size={28} className="mx-auto mb-1" />
                      <div className="font-display italic">Add an image</div>
                    </div>
                  )}
                </div>
                <label
                  className="mt-3 inline-flex items-center justify-center w-full gap-2 rounded-full bg-lavender-deep text-ivory px-4 py-2 text-sm hover:bg-lavender-deeper cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Upload size={14} />
                  )}
                  Upload image
                  <input
                    data-testid="product-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-[10px] text-ink-plum/50 text-center">
                  Max 6 MB. JPG / PNG / WebP.
                </p>
              </div>

              {/* Form fields */}
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Product ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    data-testid="product-input-id"
                    value={form.id}
                    placeholder="e.g. p-rosequartz"
                    disabled={!!editing}
                    onChange={(e) =>
                      setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                    }
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Display name <span className="text-red-500">*</span>
                  </label>
                  <input
                    data-testid="product-input-name"
                    value={form.name}
                    placeholder="e.g. Rose Quartz Heart"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Short description
                  </label>
                  <textarea
                    data-testid="product-input-blurb"
                    value={form.blurb}
                    rows={3}
                    placeholder="What makes this product special?"
                    onChange={(e) => setForm({ ...form, blurb: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    data-testid="product-input-price"
                    type="number"
                    value={form.price_inr}
                    placeholder="999"
                    onChange={(e) => setForm({ ...form, price_inr: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Badge (optional)
                  </label>
                  <input
                    data-testid="product-input-badge"
                    value={form.badge}
                    placeholder="Bestseller / New / Most Loved"
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Display order
                  </label>
                  <input
                    data-testid="product-input-order"
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Shop category{" "}
                    <span className="text-ink-plum/50 normal-case tracking-normal text-[10px]">
                      (groups variants on the public shop)
                    </span>
                  </label>
                  <select
                    data-testid="product-input-category"
                    value={form.product_category_id || ""}
                    onChange={(e) =>
                      setForm({ ...form, product_category_id: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  >
                    <option value="">— Uncategorised —</option>
                    {shopCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                  {shopCategories.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-peach-deep/80">
                      No shop categories yet. Create them under "Shop Categories" tab first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-peach-deep font-semibold">
                    Background gradient (when no image)
                  </label>
                  <select
                    data-testid="product-input-accent"
                    value={form.accent}
                    onChange={(e) => setForm({ ...form, accent: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
                  >
                    {ACCENTS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <input
                      data-testid="product-input-stock"
                      type="checkbox"
                      checked={!!form.in_stock}
                      onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                      className="w-4 h-4 accent-lavender-deep"
                    />
                    <span className="text-sm text-ink-plum">In stock (uncheck = sold out)</span>
                  </label>
                </div>
              </div>
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
                data-testid="product-form-submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6B5B95] to-[#9B8AC4] text-white px-6 py-2.5 text-sm font-medium hover:from-[#5A4C7E] hover:to-[#6B5B95] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                {editing ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
