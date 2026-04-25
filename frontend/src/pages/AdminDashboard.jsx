import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { BRAND } from "../lib/brand";
import {
  LogOut,
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  Plus,
  X,
  CalendarOff,
  CalendarIcon,
  Filter,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import SettingsPanel from "../components/admin/SettingsPanel";
import ServicesPanel from "../components/admin/ServicesPanel";
import CategoriesPanel from "../components/admin/CategoriesPanel";
import ProductsPanel from "../components/admin/ProductsPanel";
import OrdersPanel from "../components/admin/OrdersPanel";
import PromotionsPanel from "../components/admin/PromotionsPanel";
import TestimonialsPanel from "../components/admin/TestimonialsPanel";
import ProductCategoriesPanel from "../components/admin/ProductCategoriesPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAY_COLOR = (s) =>
  ({
    paid: "bg-lavender-deep text-ivory",
    pending: "bg-peach/30 text-ink-plum",
    failed: "bg-red-100 text-red-700",
  })[s] || "bg-ivory-deep text-ink-plum";

const STATUS_COLOR = (s) =>
  ({
    confirmed: "bg-lavender-deep/90 text-ivory",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-700",
    pending: "bg-peach/30 text-ink-plum",
  })[s] || "bg-ivory-deep text-ink-plum";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockDate, setNewBlockDate] = useState(null); // Date object
  const [newBlockReason, setNewBlockReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | paid | pending | failed
  const [statusFilter, setStatusFilter] = useState("all"); // all | confirmed | completed | cancelled | no_show | pending

  const token =
    typeof window !== "undefined" ? localStorage.getItem("ga_admin_token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    refresh();
    // eslint-disable-next-line
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, b, bd] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
        axios.get(`${API}/admin/blocked-dates`, { headers }),
      ]);
      setStats(s.data);
      setBookings(b.data || []);
      setBlockedDates(bd.data || []);
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("ga_admin_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const addBlocked = async (e) => {
    e.preventDefault();
    if (!newBlockDate) return;
    try {
      const dateStr = format(newBlockDate, "yyyy-MM-dd");
      await axios.post(
        `${API}/admin/blocked-dates`,
        { date: dateStr, reason: newBlockReason || "Unavailable" },
        { headers }
      );
      toast.success("Date blocked ✦");
      setNewBlockDate(null);
      setNewBlockReason("");
      refresh();
    } catch {
      toast.error("Could not block date");
    }
  };

  const removeBlocked = async (date) => {
    try {
      await axios.delete(`${API}/admin/blocked-dates/${date}`, { headers });
      toast.success("Date unblocked");
      refresh();
    } catch {
      toast.error("Could not remove");
    }
  };

  const updateBookingStatus = async (booking_id, booking_status) => {
    try {
      await axios.patch(
        `${API}/admin/bookings/${booking_id}`,
        { booking_status },
        { headers }
      );
      toast.success(`Marked ${booking_status.replace("_", " ")} ✦`);
      refresh();
    } catch {
      toast.error("Could not update");
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filter !== "all" && b.payment_status !== filter) return false;
      if (statusFilter !== "all" && b.booking_status !== statusFilter)
        return false;
      return true;
    });
  }, [bookings, filter, statusFilter]);

  const logout = () => {
    localStorage.removeItem("ga_admin_token");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-ivory aurora-bg">
      <Toaster richColors position="top-center" />
      <header className="border-b border-peach/30 bg-ivory/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={BRAND.logoRound}
              alt="GA"
              className="w-9 h-9 rounded-full"
            />
            <div className="font-display italic text-lg text-lavender-deep">
              guidance{" "}
              <span className="not-italic text-peach-deep">angel</span>
              <span className="text-xs not-italic ml-2 text-ink-plum/50">
                Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="admin-refresh"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-full border border-peach/40 bg-white px-4 py-2 text-sm hover:bg-peach/10"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              data-testid="admin-logout"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-4 py-2 text-sm hover:bg-lavender-deeper"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-10">
        <h1 className="font-display text-3xl sm:text-4xl text-ink-plum">
          Admin Sanctum
        </h1>
        <p className="text-sm text-ink-plum/60 mt-1">
          Full control over your bookings, services, products and content.
        </p>

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList
            data-testid="admin-tabs"
            className="bg-white/85 border border-peach/30 rounded-full p-1 inline-flex flex-wrap h-auto gap-1"
          >
            <TabsTrigger value="bookings" data-testid="tab-bookings" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Bookings
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Services
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Service Categories
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Shop
            </TabsTrigger>
            <TabsTrigger value="product-categories" data-testid="tab-product-categories" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Shop Categories
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Orders
            </TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-promotions" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Promotions
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials" className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-lavender-deep data-[state=active]:text-ivory">
              Testimonials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Total bookings", stats?.total_bookings ?? "—"],
            ["Paid", stats?.paid ?? "—"],
            ["Pending", stats?.pending ?? "—"],
            [
              "Revenue (₹)",
              stats?.revenue_inr != null
                ? `₹${stats.revenue_inr.toLocaleString("en-IN")}`
                : "—",
            ],
          ].map(([label, val]) => (
            <div
              key={label}
              data-testid={`stat-${label.replace(/\s+/g, "-").toLowerCase()}`}
              className="rounded-2xl bg-white/85 border border-peach/30 px-5 py-5 shadow-soft"
            >
              <div className="text-[11px] tracking-[0.22em] uppercase text-peach-deep">
                {label}
              </div>
              <div className="font-display text-3xl text-lavender-deep mt-1">
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Block-out dates moved into Schedule tab below */}
        </TabsContent>

        <TabsContent value="schedule" className="mt-6 space-y-6">
          <SettingsPanel token={token} />

          <div className="rounded-3xl bg-white/85 border border-peach/30 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <CalendarOff size={18} className="text-lavender-deep" />
            <h2 className="font-display text-xl text-ink-plum">
              Block-out dates
            </h2>
          </div>
          <p className="text-sm text-ink-plum/60 mt-1">
            Mark dates when you're unavailable. Booking calendar will hide them.
          </p>

          <form
            onSubmit={addBlocked}
            data-testid="blocked-form"
            className="mt-5 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep">
                Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    data-testid="blocked-date-input"
                    className="mt-1.5 inline-flex items-center gap-2 rounded-xl border border-peach/30 bg-white px-3 py-2 text-sm hover:border-lavender-deep min-w-[180px] justify-between"
                  >
                    <span className={newBlockDate ? "text-ink-plum" : "text-ink-plum/50"}>
                      {newBlockDate ? format(newBlockDate, "EEE, dd MMM yyyy") : "Pick a date"}
                    </span>
                    <CalendarIcon size={14} className="text-lavender-deep" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-peach/30 rounded-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={newBlockDate}
                    onSelect={setNewBlockDate}
                    disabled={(d) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return d < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep">
                Reason (optional)
              </label>
              <input
                data-testid="blocked-reason-input"
                value={newBlockReason}
                onChange={(e) => setNewBlockReason(e.target.value)}
                placeholder="Vacation, retreat, personal day…"
                className="mt-1.5 w-full rounded-xl border border-peach/30 bg-white px-3 py-2 outline-none focus:border-lavender-deep focus:ring-2 focus:ring-peach/40"
              />
            </div>
            <button
              type="submit"
              data-testid="blocked-add-btn"
              disabled={!newBlockDate}
              className="inline-flex items-center gap-1.5 bg-lavender-deep text-ivory rounded-full px-5 py-2.5 text-sm hover:bg-lavender-deeper disabled:opacity-50"
            >
              <Plus size={14} /> Block
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {blockedDates.length === 0 && (
              <span className="text-sm text-ink-plum/60">
                No blocked dates yet.
              </span>
            )}
            {blockedDates.map((bd) => (
              <span
                key={bd.date}
                data-testid={`blocked-${bd.date}`}
                className="inline-flex items-center gap-2 bg-peach/15 border border-peach/40 text-ink-plum rounded-full pl-3 pr-1 py-1 text-sm"
              >
                <span className="font-medium">{bd.date}</span>
                {bd.reason && (
                  <span className="text-ink-plum/60 text-xs">· {bd.reason}</span>
                )}
                <button
                  onClick={() => removeBlocked(bd.date)}
                  className="ml-1 w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-peach/40"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-0 mt-0">
        <div className="mt-6 rounded-3xl bg-white/85 border border-peach/30 overflow-hidden">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-peach/20 bg-ivory-deep/30">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-peach-deep">
              <Filter size={12} /> Filter
            </div>
            <div className="inline-flex items-center gap-1 bg-white rounded-full border border-peach/30 p-1">
              {[
                ["all", "All"],
                ["paid", "Paid"],
                ["pending", "Pending"],
                ["failed", "Failed"],
              ].map(([k, lbl]) => (
                <button
                  key={k}
                  data-testid={`filter-pay-${k}`}
                  onClick={() => setFilter(k)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    filter === k
                      ? "bg-lavender-deep text-ivory"
                      : "text-ink-plum/70 hover:bg-peach/15"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1 bg-white rounded-full border border-peach/30 p-1">
              {[["all", "All"]].concat(STATUS_OPTIONS.map((o) => [o.value, o.label])).map(([k, lbl]) => (
                <button
                  key={k}
                  data-testid={`filter-status-${k}`}
                  onClick={() => setStatusFilter(k)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    statusFilter === k
                      ? "bg-lavender-deep text-ivory"
                      : "text-ink-plum/70 hover:bg-peach/15"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs text-ink-plum/60">
              {filtered.length} of {bookings.length} bookings
            </div>
          </div>

          <Table data-testid="admin-bookings-table">
            <TableHeader className="bg-ivory-deep/50">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date / Slot</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-ink-plum/60">
                    {bookings.length === 0
                      ? "No bookings yet. The first soul is on the way."
                      : "No bookings match these filters."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((b) => (
                <TableRow key={b.id} data-testid={`row-${b.id}`}>
                  <TableCell>
                    <div className="font-medium text-ink-plum">
                      {b.customer_name}
                    </div>
                    <div className="text-xs text-ink-plum/60">
                      {b.customer_email}
                    </div>
                    <div className="text-xs text-ink-plum/60">
                      {b.customer_phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.service_name}
                    <div className="text-xs text-ink-plum/60">
                      ID: {b.service_id}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.booking_date ? (
                      <>
                        <div>{b.booking_date}</div>
                        <div className="text-xs text-ink-plum/60">
                          {b.booking_slot}
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-plum/60 text-xs">
                        Voice note
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-display text-lavender-deep">
                    ₹{b.service_price_inr?.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge className={PAY_COLOR(b.payment_status)}>
                      {b.payment_status}
                      {b.is_mock_payment ? " · mock" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-testid={`status-dropdown-${b.id}`}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR(b.booking_status)}`}
                        >
                          {(b.booking_status || "pending").replace("_", " ")}
                          <ChevronDown size={12} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-white border-peach/30">
                        {STATUS_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            data-testid={`status-set-${opt.value}-${b.id}`}
                            onClick={() => updateBookingStatus(b.id, opt.value)}
                            className="cursor-pointer"
                          >
                            {b.booking_status === opt.value ? (
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
                        href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                      <a
                        href={`mailto:${b.customer_email}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                        title="Email"
                      >
                        <Mail size={14} />
                      </a>
                      <a
                        href={`tel:${b.customer_phone}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-peach/20 text-lavender-deep hover:bg-peach/40"
                        title="Call"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesPanel token={token} />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesPanel token={token} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ProductsPanel token={token} />
        </TabsContent>

        <TabsContent value="product-categories" className="mt-6">
          <ProductCategoriesPanel token={token} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrdersPanel token={token} />
        </TabsContent>

        <TabsContent value="promotions" className="mt-6">
          <PromotionsPanel token={token} />
        </TabsContent>

        <TabsContent value="testimonials" className="mt-6">
          <TestimonialsPanel token={token} />
        </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
