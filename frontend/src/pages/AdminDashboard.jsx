import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BRAND } from "../lib/brand";
import { LogOut, RefreshCw, Phone, Mail, MessageCircle } from "lucide-react";
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColor = (s) =>
  ({
    paid: "bg-lavender-deep text-ivory",
    pending: "bg-peach/30 text-ink-plum",
    failed: "bg-red-100 text-red-700",
    confirmed: "bg-lavender-deep text-ivory",
  })[s] || "bg-ivory-deep text-ink-plum";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("ga_admin_token") : null;

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
      const headers = { Authorization: `Bearer ${token}` };
      const [s, b] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
      ]);
      setStats(s.data);
      setBookings(b.data || []);
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("ga_admin_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

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
          Bookings Dashboard
        </h1>
        <p className="text-sm text-ink-plum/60 mt-1">
          Live data from your sanctuary.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
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

        <div className="mt-10 rounded-3xl bg-white/85 border border-peach/30 overflow-hidden">
          <Table data-testid="admin-bookings-table">
            <TableHeader className="bg-ivory-deep/50">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date / Slot</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-ink-plum/60">
                    No bookings yet. The first soul is on the way.
                  </TableCell>
                </TableRow>
              )}
              {bookings.map((b) => (
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
                    <Badge className={statusColor(b.payment_status)}>
                      {b.payment_status}
                      {b.is_mock_payment ? " · mock" : ""}
                    </Badge>
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
      </main>
    </div>
  );
}
