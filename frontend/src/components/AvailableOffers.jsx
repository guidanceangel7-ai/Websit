import React, { useEffect, useState } from "react";
import axios from "axios";
import { Sparkles, Tag, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Shows the active coupon codes a user can apply right now.
 *
 * Props:
 *   kind        - "services" | "products"  (filters which offers are relevant)
 *   appliedCode - currently applied coupon code (uppercase, optional)
 *   onApply     - (code: string) => void   tap-to-fill callback
 */
export default function AvailableOffers({ kind = "services", appliedCode, onApply }) {
  const [promos, setPromos] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/promotions/active`)
      .then((r) => {
        if (!alive) return;
        const list = Array.isArray(r.data) ? r.data : [];
        // Only show promos that have a public code AND apply to this kind of purchase
        const filtered = list.filter((p) => {
          if (!p.code) return false;
          if (p.scope === "site_wide") return true;
          if (kind === "services" && p.scope === "services_only") return true;
          if (kind === "products" && p.scope === "products_only") return true;
          return false;
        });
        setPromos(filtered);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [kind]);

  if (promos.length === 0) return null;

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Code ${code} copied ✦`);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // clipboard may be unavailable on http — silently swallow
    }
  };

  return (
    <div
      data-testid="available-offers"
      className="rounded-2xl bg-gradient-to-br from-[#6B5B95] via-[#9B8AC4] to-[#6B5B95] text-ivory px-5 py-4 shadow-[0_8px_28px_rgba(107,91,149,0.25)]"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#EBB99A] font-bold">
        <Sparkles size={12} /> Available offers
      </div>
      <div className="mt-3 space-y-2">
        {promos.map((p) => {
          const isApplied = appliedCode && appliedCode === p.code;
          const valueStr =
            p.discount_type === "percent"
              ? `${p.discount_value}% off`
              : `₹${Number(p.discount_value).toLocaleString("en-IN")} off`;
          return (
            <div
              key={p.id}
              data-testid={`offer-${p.code}`}
              className="rounded-xl bg-ivory/10 border border-ivory/20 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-[#EBB99A] text-[#3A2E5D] font-mono font-bold tracking-[0.18em] text-xs px-2.5 py-1 rounded-md">
                    <Tag size={11} /> {p.code}
                  </span>
                  <span className="text-xs text-ivory font-display italic">
                    {valueStr}
                  </span>
                </div>
                {(p.banner_text || p.title) && (
                  <div className="mt-1 text-[11px] text-ivory/75 line-clamp-1">
                    {p.banner_text || p.title}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyCode(p.code)}
                  data-testid={`offer-copy-${p.code}`}
                  className="inline-flex items-center gap-1 text-[11px] tracking-wide bg-ivory/10 hover:bg-ivory/20 text-ivory rounded-full px-3 py-1.5 transition"
                  title="Copy code"
                >
                  {copied === p.code ? <Check size={12} /> : <Copy size={12} />}
                  {copied === p.code ? "Copied" : "Copy"}
                </button>
                {onApply && (
                  <button
                    type="button"
                    disabled={isApplied}
                    onClick={() => onApply(p.code)}
                    data-testid={`offer-apply-${p.code}`}
                    className="inline-flex items-center gap-1 text-[11px] tracking-wide bg-[#EBB99A] hover:bg-[#D9A382] text-[#3A2E5D] font-semibold rounded-full px-3 py-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isApplied ? (
                      <>
                        <Check size={12} /> Applied
                      </>
                    ) : (
                      "Tap to apply"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
