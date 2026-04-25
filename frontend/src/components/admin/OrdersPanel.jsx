import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  Check,
  Filter,
  Package,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR = (s) =>
  ({
    confirmed: "bg-lavender-deep text-ivory",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-peach/30 text-ink-plum",
  })[s] || "bg-ivory-deep text-ink-plum";

const PAY_COLOR = (s) =>
  ({
    paid: "bg-lavender-deep text-ivory",
    pending: "bg-peach/30 text-ink-plum",
    failed: "bg-red-100 text-red-700",
  })[s] || "bg-ivory-deep text-ink-plum";

export default function OrdersPanel({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(r.data || []);
    } catch (e) {
      toast.error("Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = async (oid, order_status) => {
    try {
      await axios.patch(
        `${API}/admin/orders/${oid}`,
        { order_status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Marked ${order_status} ✦`);
      refresh();
    } catch {
      toast.error("Could not update");
    }
  };

  const filtered = orders.filter((o) =>
    statusFilter === "all" ? true : o.order_status === statusFilter
  );

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.payment_status === "paid").length,
    revenue: orders
      .filter((o) => o.payment_status === "paid")
      .reduce((s, o) => s + (o.total_inr || 0), 0),
    pending: orders.filter((o) => o.order_status === "pending").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total orders", stats.total],
          ["Paid orders", stats.paid],
          ["Pending fulfilment", stats.pending],
          ["Revenue (₹)", `₹${stats.revenue.toLocaleString("en-IN")}`],
        ].map(([label, val]) => (
          <div
            key={label}
            data-testid={`order-stat-${label.replace(/\s+/g, "-").toLowerCase()}`}
            className="rounded-2xl bg-white/85 border border-peach/30 px-5 py-5 shadow-soft"
          >
            <div className="text-[11px] tracking-[0.22em] uppercase text-peach-deep">
              {label}
            </div>
            <div className="font-display text-3xl text-lavender-deep mt-1">{val}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white/85 border border-peach/30 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-peach/20 bg-ivory-deep/30">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-peach-deep">
            <Package size={12} /> Orders
          </div>
          <div className="inline-flex items-center gap-1 bg-white rounded-full border border-peach/30 p-1">
            {[["all", "All"]].concat(STATUS_OPTIONS.map((o) => [o.value, o.label])).map(
              ([k, lbl]) => (
                <button
                  key={k}
                  data-testid={`order-filter-${k}`}
                  onClick={() => setStatusFilter(k)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    statusFilter === k
                      ? "bg-lavender-deep text-ivory"
                      : "text-ink-plum/70 hover:bg-peach/15"
                  }`}
                >
                  {lbl}
                </button>
              )
            )}
          </div>
          <div className="ml-auto inline-flex items-center gap-2">
            <button
              data-testid="orders-refresh"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-full border border-peach/40 bg-white px-3 py-1.5 text-xs hover:bg-peach/10"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <span className="text-xs text-ink-plum/60">
              {filtered.length} of {orders.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-10 inline-flex items-center gap-2 text-ink-plum/60">
            <Loader2 className="animate-spin" size={14} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-plum/60 text-sm">
            {orders.length === 0
              ? "No orders yet — your first sacred-shop order will appear here."
              : "No orders match this filter."}
          </div>
        ) : (
          <Table data-testid="orders-table">
            <TableHeader className="bg-ivory-deep/50">
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <React.Fragment key={o.id}>
                  <TableRow data-testid={`order-row-${o.id}`}>
                    <TableCell>
                      <button
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                        className="text-xs font-mono text-lavender-deep hover:underline"
                      >
                        #{o.id.slice(0, 8).toUpperCase()}
                      </button>
                      <div className="text-[10px] text-ink-plum/50 mt-0.5">
                        {(o.created_at || "").slice(0, 10)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-ink-plum">{o.customer_name}</div>
                      <div className="text-xs text-ink-plum/60">{o.customer_email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.items?.length || 0} item{(o.items?.length || 0) > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="font-display text-lavender-deep">
                      ₹{(o.total_inr || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge className={PAY_COLOR(o.payment_status)}>
                        {o.payment_status}
                        {o.is_mock_payment ? " · mock" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-testid={`order-status-${o.id}`}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR(o.order_status)}`}
                          >
                            {(o.order_status || "pending").replace("_", " ")}
                            <ChevronDown size={12} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-white border-peach/30">
                          {STATUS_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt.value}
                              data-testid={`order-set-${opt.value}-${o.id}`}
                              onClick={() => updateStatus(o.id, opt.value)}
                              className="cursor-pointer"
                            >
                              {o.order_status === opt.value ? (
                                <Check size={14} className="mr-2 text-lavender-deep" />
                              ) : (
                                <span className="w-[14px] mr-2" />
                              )}
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${(o.customer_phone || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        <a
                          href={`mailto:${o.customer_email}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                          title="Email"
                        >
                          <Mail size={14} />
                        </a>
                        <a
                          href={`tel:${o.customer_phone}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                          title="Call"
                        >
                          <Phone size={14} />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === o.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-ivory/60 border-t-2 border-peach/30">
                        <div className="grid sm:grid-cols-3 gap-6 py-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-peach-deep font-bold mb-2">
                              Items
                            </div>
                            <ul className="text-sm space-y-1.5">
                              {(o.items || []).map((it, i) => (
                                <li key={`${o.id}-${it.product_id || i}`} className="flex justify-between gap-3">
                                  <span className="text-ink-plum">
                                    {it.product_name}{" "}
                                    <span className="text-ink-plum/60">× {it.quantity}</span>
                                  </span>
                                  <span className="text-ink-plum font-medium">
                                    ₹{(it.line_total_inr || 0).toLocaleString("en-IN")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-peach-deep font-bold mb-2">
                              Shipping address
                            </div>
                            <div className="text-sm text-ink-plum leading-relaxed">
                              {o.customer_name}
                              <br />
                              {o.address?.line1}
                              {o.address?.line2 ? `, ${o.address?.line2}` : ""}
                              <br />
                              {o.address?.city}, {o.address?.state} {o.address?.postal_code}
                              <br />
                              {o.address?.country}
                            </div>
                            <div className="mt-2 text-xs text-ink-plum/60">
                              Phone: {o.customer_phone}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-peach-deep font-bold mb-2">
                              Notes
                            </div>
                            <div className="text-sm text-ink-plum/80 italic">
                              {o.notes || "—"}
                            </div>
                            <div className="mt-3 text-[10px] text-ink-plum/40">
                              Razorpay: {o.razorpay_order_id}
                              <br />
                              Payment ID: {o.razorpay_payment_id || "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
