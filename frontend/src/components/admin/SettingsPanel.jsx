import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Save, Plus, X } from "lucide-react";

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

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h === 24) return "12 AM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function SettingsPanel({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState(30);
  // windows is a 7-length array; each entry is a list of [start, end] pairs.
  const [windows, setWindows] = useState(
    Array.from({ length: 7 }).map(() => [])
  );

  useEffect(() => {
    axios
      .get(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        const data = r.data || {};
        setSlotMinutes(data.slot_minutes || 30);
        const wmap = data.windows || {};
        setWindows(
          Array.from({ length: 7 }).map((_, d) =>
            (wmap[String(d)] || []).map(([a, b]) => [a, b])
          )
        );
      })
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, [token]);

  const addWindow = (d) => {
    const next = windows.map((arr) => [...arr]);
    // sensible default — pick a 1-hour slot starting at 10 AM if empty,
    // else right after the previous window's end.
    const last = next[d][next[d].length - 1];
    const start = last ? Math.min(last[1], 22) : 10;
    next[d].push([start, Math.min(start + 1, 23)]);
    setWindows(next);
  };

  const removeWindow = (d, idx) => {
    const next = windows.map((arr) => [...arr]);
    next[d].splice(idx, 1);
    setWindows(next);
  };

  const updateWindow = (d, idx, which, value) => {
    const next = windows.map((arr) => arr.map((w) => [...w]));
    next[d][idx][which] = parseInt(value);
    setWindows(next);
  };

  const copyToAllWeekdays = (d) => {
    const src = (windows[d] || []).map((w) => [...w]);
    const next = windows.map((arr, i) =>
      i >= 0 && i <= 4 ? src.map((w) => [...w]) : arr
    );
    setWindows(next);
    toast.success("Copied to weekdays (Mon–Fri)");
  };

  const save = async () => {
    setSaving(true);
    try {
      // client-side validation
      for (let d = 0; d < 7; d++) {
        for (const w of windows[d]) {
          if (!Array.isArray(w) || w.length !== 2) continue;
          if (w[0] >= w[1]) {
            toast.error(
              `${DAYS[d].label}: window start (${fmtHour(w[0])}) must be before end (${fmtHour(w[1])})`
            );
            setSaving(false);
            return;
          }
        }
      }
      const windowsMap = {};
      for (let d = 0; d < 7; d++) {
        windowsMap[String(d)] = (windows[d] || []).map(([a, b]) => [a, b]);
      }
      await axios.put(
        `${API}/admin/settings`,
        { slot_minutes: slotMinutes, windows: windowsMap },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
            Add multiple time windows per day (e.g. 12&nbsp;PM – 2&nbsp;PM and
            5&nbsp;PM – 7&nbsp;PM). A day with no window is automatically closed.
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

      <div className="mt-6">
        <label className="block text-[11px] uppercase tracking-[0.22em] text-peach-deep font-semibold">
          Slot length
        </label>
        <select
          data-testid="settings-slot-mins"
          value={slotMinutes}
          onChange={(e) => setSlotMinutes(parseInt(e.target.value))}
          className="mt-2 w-full sm:w-48 rounded-xl border-2 border-peach/30 bg-white px-3 py-2 text-ink-plum focus:border-lavender-deep outline-none"
        >
          {SLOT_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </div>

      <div className="mt-7 space-y-3">
        {DAYS.map((d) => {
          const wins = windows[d.v] || [];
          const isClosed = wins.length === 0;
          return (
            <div
              key={d.v}
              data-testid={`settings-day-row-${d.label.toLowerCase()}`}
              className={`rounded-2xl border-2 p-4 transition ${
                isClosed
                  ? "bg-ivory-deep/40 border-peach/20"
                  : "bg-white border-peach/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 text-center rounded-full py-1 text-sm font-semibold ${
                      isClosed
                        ? "bg-ivory-deep text-ink-plum/40"
                        : "bg-lavender-deep text-ivory"
                    }`}
                  >
                    {d.label}
                  </div>
                  <span className="text-xs text-ink-plum/60">
                    {isClosed
                      ? "Closed"
                      : `${wins.length} window${wins.length > 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {d.v <= 4 && wins.length > 0 && (
                    <button
                      type="button"
                      data-testid={`settings-day-copy-${d.label.toLowerCase()}`}
                      onClick={() => copyToAllWeekdays(d.v)}
                      className="text-[11px] tracking-wide text-ink-plum/60 hover:text-lavender-deep"
                    >
                      Copy to Mon–Fri
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid={`settings-day-add-${d.label.toLowerCase()}`}
                    onClick={() => addWindow(d.v)}
                    className="inline-flex items-center gap-1 rounded-full bg-peach/20 hover:bg-peach/30 text-peach-deep px-3 py-1 text-xs font-semibold"
                  >
                    <Plus size={12} /> Window
                  </button>
                </div>
              </div>

              {wins.length > 0 && (
                <div className="mt-3 space-y-2">
                  {wins.map((w, idx) => (
                    <div
                      key={`${d.v}-${idx}`}
                      data-testid={`settings-window-${d.label.toLowerCase()}-${idx}`}
                      className="flex flex-wrap items-center gap-2 bg-ivory-deep/40 rounded-xl px-3 py-2"
                    >
                      <span className="text-[10px] tracking-[0.22em] uppercase text-peach-deep/80 font-semibold">
                        From
                      </span>
                      <select
                        value={w[0]}
                        onChange={(e) =>
                          updateWindow(d.v, idx, 0, e.target.value)
                        }
                        className="rounded-lg border border-peach/30 bg-white px-2 py-1 text-sm"
                      >
                        {HOURS.slice(0, 24).map((h) => (
                          <option key={h} value={h}>
                            {fmtHour(h)}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] tracking-[0.22em] uppercase text-peach-deep/80 font-semibold">
                        to
                      </span>
                      <select
                        value={w[1]}
                        onChange={(e) =>
                          updateWindow(d.v, idx, 1, e.target.value)
                        }
                        className="rounded-lg border border-peach/30 bg-white px-2 py-1 text-sm"
                      >
                        {HOURS.slice(1, 25).map((h) => (
                          <option key={h} value={h}>
                            {fmtHour(h)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        data-testid={`settings-window-remove-${d.label.toLowerCase()}-${idx}`}
                        onClick={() => removeWindow(d.v, idx)}
                        className="ml-auto w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-plum/60 hover:bg-white hover:text-rose-500"
                        title="Remove window"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
