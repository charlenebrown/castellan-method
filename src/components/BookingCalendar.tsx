import { useMemo, useState } from 'react';
import slotData from '../data/slots.json';

type SlotFile = { generated: string; timezone: string; durationMinutes: number; days: Record<string, string[]> };
const data = slotData as SlotFile;

const BOOKED_KEY = 'cm-booked';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function readBooked(): string[] {
  try { return JSON.parse(window.localStorage.getItem(BOOKED_KEY) ?? '[]'); } catch { return []; }
}
function writeBooked(list: string[]) {
  try { window.localStorage.setItem(BOOKED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function icsFor(iso: string, name: string): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + data.durationMinutes * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Castellan Method Demo//EN', 'BEGIN:VEVENT',
    `UID:${f(start)}@castellan-demo`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    'SUMMARY:Introductory conversation with Dr. Naomi Castellan (demo)',
    `DESCRIPTION:Demo booking for ${name}. This site is fictional.`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export default function BookingCalendar() {
  const [booked, setBooked] = useState<string[]>(() => readBooked());
  const dayKeys = useMemo(() => Object.keys(data.days).sort(), []);
  const months = useMemo(() => Array.from(new Set(dayKeys.map((k) => k.slice(0, 7)))), [dayKeys]);
  const [monthIdx, setMonthIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [done, setDone] = useState<{ iso: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', topic: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visitorTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const month = months[monthIdx];
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const freeSlots = (day: string) => (data.days[day] ?? []).filter((s) => !booked.includes(s));

  const fmtTime = (iso: string, tz?: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const fmtLong = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  function pickDay(day: string) { setSelectedDay(day); setSelectedSlot(null); }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Please enter a valid email address.';
    setErrors(err);
    if (Object.keys(err).length || !selectedSlot) return;
    const next = [...booked, selectedSlot];
    writeBooked(next);
    setBooked(next);
    setDone({ iso: selectedSlot, name: form.name });
  }

  function download() {
    if (!done) return;
    const blob = new Blob([icsFor(done.iso, done.name)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'castellan-conversation.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reset() { setDone(null); setSelectedDay(null); setSelectedSlot(null); setForm({ name: '', email: '', topic: '', note: '' }); }

  if (done) {
    return (
      <div className="card text-center sm:p-12" role="status">
        <p className="eyebrow">You are booked (demo)</p>
        <h2 className="h2 mt-3">{fmtLong(done.iso)}</h2>
        <p className="mt-2 font-serif text-3xl">{fmtTime(done.iso)} <span className="text-lg text-charcoal/60">{visitorTz}</span></p>
        <p className="mt-1 text-sm text-charcoal/60">{fmtTime(done.iso, data.timezone)} Eastern Time</p>
        <p className="mx-auto mt-6 max-w-md text-charcoal/80">Thank you, {done.name.split(' ')[0]}. In a real booking you would receive an email with a video link. This is a demonstration, so nothing has been scheduled.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={download} className="btn btn-primary">Add to my calendar</button>
          <button type="button" onClick={reset} className="btn btn-ghost">Book another time</button>
        </div>
      </div>
    );
  }

  const slots = selectedDay ? freeSlots(selectedDay) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card !p-5 sm:!p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl" id="cal-month">{monthLabel}</h2>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous month" disabled={monthIdx === 0} onClick={() => setMonthIdx((i) => i - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/20 disabled:opacity-30 enabled:hover:bg-bone-deep">←</button>
            <button type="button" aria-label="Next month" disabled={monthIdx === months.length - 1} onClick={() => setMonthIdx((i) => i + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/20 disabled:opacity-30 enabled:hover:bg-bone-deep">→</button>
          </div>
        </div>
        <div role="grid" aria-labelledby="cal-month" className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((d) => <div key={d} role="columnheader" className="pb-2 text-xs font-semibold uppercase tracking-wider text-charcoal/50">{d}</div>)}
          {Array.from({ length: first.getDay() }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const key = `${month}-${String(i + 1).padStart(2, '0')}`;
            const count = freeSlots(key).length;
            const on = count > 0;
            const sel = selectedDay === key;
            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                disabled={!on}
                aria-pressed={sel}
                aria-label={`${new Date(y, m - 1, i + 1).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${on ? `, ${count} times available` : ', unavailable'}`}
                onClick={() => pickDay(key)}
                className={`aspect-square rounded-xl text-sm font-medium transition ${sel ? 'bg-oxblood text-bone' : on ? 'bg-bone-deep/70 hover:bg-brass/30' : 'text-charcoal/25'}`}
              >{i + 1}</button>
            );
          })}
        </div>
        <p className="mt-5 text-xs text-charcoal/60">Times shown in your time zone ({visitorTz}). Dr. Castellan is on Eastern Time.</p>
      </div>

      <div className="card !p-5 sm:!p-8" aria-live="polite">
        {!selectedDay && (
          <div className="grid h-full min-h-48 place-items-center text-center">
            <div>
              <p className="font-serif text-2xl">Choose a day</p>
              <p className="mt-2 text-charcoal/70">Highlighted days have open 30-minute conversations.</p>
            </div>
          </div>
        )}

        {selectedDay && !selectedSlot && (
          <div>
            <h3 className="font-serif text-2xl">{fmtLong(`${selectedDay}T12:00:00-05:00`)}</h3>
            <p className="mb-4 mt-1 text-sm text-charcoal/60">Select a start time</p>
            <div className="grid grid-cols-2 gap-2.5">
              {slots.map((s) => (
                <button key={s} type="button" onClick={() => setSelectedSlot(s)} className="rounded-xl border border-charcoal/20 px-3 py-3 text-sm font-semibold transition hover:border-oxblood hover:bg-bone-deep">
                  {fmtTime(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDay && selectedSlot && (
          <form onSubmit={confirm} noValidate className="grid gap-4">
            <button type="button" onClick={() => setSelectedSlot(null)} className="justify-self-start text-sm font-semibold underline underline-offset-4">← Change time</button>
            <div>
              <p className="eyebrow">Your conversation</p>
              <p className="mt-1 font-serif text-2xl">{fmtLong(selectedSlot)}, {fmtTime(selectedSlot)}</p>
            </div>
            <div className="field">
              <label htmlFor="bk-name">Full name *</label>
              <input id="bk-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
              {errors.name && <p className="err" role="alert">{errors.name}</p>}
            </div>
            <div className="field">
              <label htmlFor="bk-email">Work email *</label>
              <input id="bk-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
              {errors.email && <p className="err" role="alert">{errors.email}</p>}
            </div>
            <div className="field">
              <label htmlFor="bk-topic">What would you like to discuss?</label>
              <select id="bk-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                <option value="">Choose one</option>
                <option>Personal advisory</option>
                <option>Team working sessions</option>
                <option>The Roundtable</option>
                <option>An organization-wide program</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary justify-self-start">Confirm conversation</button>
          </form>
        )}
      </div>
    </div>
  );
}
