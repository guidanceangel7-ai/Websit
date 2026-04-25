import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DAYS = [
  { v: 0, label: "Mon" },
  { v: 1, label: "Tue" },
  { v: 2, label: "Wed" },
  { v: 3, label: "Thu" },
  { v: 4, label: "Fri" },
  { v: 5, label: "Sat" },
  { v: 6, label: "Sun" },
];

const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120];
const HOURS = Array.from({ length: 25 }).map((_, i) => i);

export default function SettingsPanel({ token }) {
  const headers = { Authorization: `Bearer ${token}` };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({
    open_hour: 10,
    close_hour: 20,
    slot_minutes: 30,
    open_days: [0, 1, 2, 3, 4, 5],
  });

  useEffect(() => {
    axios
      .get(`${API}/admin/settings`, { headers })
      .then((r) => setS(r.data))
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  const toggleDay = (d) => {
    const set = new Set(s.open_days);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    setS({ ...s, open_days: Array.from(set).sort() });
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, s, { headers });
      toast.success("Working hours saved ✦");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 inline-flex items-center gap-2 text-ink-plum/60">
        <Loader2 className="animate-spin" size={16} /> Loading…
      </div>
    );

  return (
    <div className="rounded-3xl bg-white/90 border border-peach/30 p-6 sm:p-8 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink-plum">Working Hours</h2>
          <p className="text-sm text-ink-plum/60 mt-1">
            Customers will only see slots within these hours.
          </p>
        </div>
        <button
          data-testid="settings-save"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-lavender-deep text-ivory px-5 py-2.5 text-sm hover:bg-lavender-deeper disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          Save Settings
        </button>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-5">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep font-semibold">
            Open hour
          </label>
          <select
            data-testid="settings-open-hour"
            value={s.open_hour}
            onChange={(e) => setS({ ...s, open_hour: parseInt(e.target.value) })}
            className="mt-2 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
          >
            {HOURS.slice(0, 24).map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00 ({h < 12 ? "AM" : "PM"})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep font-semibold">
            Close hour
          </label>
          <select
            data-testid="settings-close-hour"
            value={s.close_hour}
            onChange={(e) => setS({ ...s, close_hour: parseInt(e.target.value) })}
            className="mt-2 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
          >
            {HOURS.slice(1, 25).map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00 ({h < 12 ? "AM" : "PM"})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep font-semibold">
            Slot length
          </label>
          <select
            data-testid="settings-slot-mins"
            value={s.slot_minutes}
            onChange={(e) => setS({ ...s, slot_minutes: parseInt(e.target.value) })}
            className="mt-2 w-full rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-7">
        <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep font-semibold">
          Open days
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = s.open_days.includes(d.v);
            return (
              <button
                key={d.v}
                type="button"
                data-testid={`settings-day-${d.label.toLowerCase()}`}
                onClick={() => toggleDay(d.v)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition ${
                  active
                    ? "bg-lavender-deep text-ivory border-lavender-deep shadow-[0_4px_12px_rgba(107,91,149,0.3)]"
                    : "bg-white border-peach/40 text-ink-plum hover:border-lavender-deep"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
