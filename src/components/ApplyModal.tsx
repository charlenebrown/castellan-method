import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Route = 'individual' | 'team' | 'organization';
type Values = Record<string, string | boolean>;

const ROUTES: { key: Route; title: string; blurb: string }[] = [
  { key: 'individual', title: 'Just me', blurb: 'Private advisory for one leader.' },
  { key: 'team', title: 'My team', blurb: 'Working sessions for a leadership team.' },
  { key: 'organization', title: 'My organization', blurb: 'A briefing for a larger company or institution.' },
];

const DRAFT_KEY = 'cm-apply-draft';
const INBOX_KEY = 'cm-demo-inbox';

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* storage may be blocked */ }
}

function Select({ id, label, value, onChange, options, error }: { id: string; label: string; value: string; onChange: (v: string) => void; options: string[]; error?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error}>
        <option value="">Choose one</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

function Input({ id, label, value, onChange, type = 'text', error, autoComplete, required }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; error?: string; autoComplete?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input id={id} type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-required={required} />
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

export default function ApplyModal({ base }: { base: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [step, setStep] = useState<'route' | 'form' | 'done'>('route');
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ref, setRef] = useState('');

  const set = (k: string) => (v: string) => setValues((prev) => ({ ...prev, [k]: v }));
  const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '');

  const open = useCallback((preset?: Route) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    const draft = safeGet(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.values) setValues(d.values);
        if (preset) { setRoute(preset); setStep('form'); }
        else if (d.route) { setRoute(d.route); setStep('form'); }
      } catch { /* ignore bad draft */ }
    } else if (preset) { setRoute(preset); setStep('form'); }
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('[data-apply]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      const preset = el.getAttribute('data-apply') as Route | '';
      open(preset === 'individual' || preset === 'team' || preset === 'organization' ? preset : undefined);
    };
    document.addEventListener('click', onClick);
    if (window.location.hash === '#apply') open();
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClose = () => {
      document.documentElement.style.overflow = '';
      lastFocus.current?.focus?.();
      if (step === 'done') { setStep('route'); setRoute(null); setValues({}); setErrors({}); }
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, [step]);

  // Save progress as the visitor types.
  useEffect(() => {
    if (step === 'form') safeSet(DRAFT_KEY, JSON.stringify({ route, values }));
  }, [route, values, step]);

  const fields = useMemo(() => route, [route]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!str('name').trim()) e.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(str('email'))) e.email = 'Please enter a valid email address.';
    if (route === 'organization' && !str('company').trim()) e.company = 'Please enter your organization.';
    if (route === 'organization' && !str('headcount')) e.headcount = 'Please choose a size.';
    if (route === 'organization' && !str('engagement')) e.engagement = 'Please choose an engagement type.';
    if (route === 'team' && !str('teamSize')) e.teamSize = 'Please choose a team size.';
    if (route === 'individual' && !str('focus')) e.focus = 'Please choose a focus area.';
    if (!values.privacy) e.privacy = 'Please confirm you have read the privacy notice.';
    return e;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      dialogRef.current?.querySelector<HTMLElement>(`#ap-${first}`)?.focus();
      return;
    }
    const reference = `CM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    // Demo only: keep the "submission" in this browser. Nothing is sent anywhere.
    const inbox = JSON.parse(safeGet(INBOX_KEY) ?? '[]');
    inbox.push({ reference, route, values, at: new Date().toISOString() });
    safeSet(INBOX_KEY, JSON.stringify(inbox));
    try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setRef(reference);
    setStep('done');
  }

  const summary: Record<Route, string> = {
    individual: 'A member of the team replies within two business days to arrange your complimentary conversation.',
    team: 'We reply within two business days to schedule a short call about your team and goals.',
    organization: 'Our engagement team replies within two business days to arrange a confidential briefing and, if needed, an NDA.',
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="apply-title"
      onClick={(e) => { if (e.target === dialogRef.current) close(); }}
      className="m-auto w-[min(100%-1.5rem,40rem)] max-h-[92vh] overflow-hidden rounded-3xl bg-bone p-0 text-charcoal shadow-2xl backdrop:bg-navy/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[92vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-bone-deep px-6 pb-4 pt-6 sm:px-8">
          <div>
            <p className="eyebrow">Apply</p>
            <h2 id="apply-title" className="mt-1 text-2xl sm:text-3xl">
              {step === 'done' ? 'Thank you' : 'Tell us about your work'}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-charcoal/20 hover:bg-bone-deep">
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-8">
          <p className="mb-5 rounded-xl bg-brass/15 px-4 py-2.5 text-xs text-charcoal/80">Demonstration only. Nothing you enter is sent anywhere; it stays in this browser.</p>

          {step === 'route' && (
            <fieldset>
              <legend className="mb-4 font-serif text-xl">Who is this for?</legend>
              <div className="grid gap-3">
                {ROUTES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => { setRoute(r.key); setStep('form'); }}
                    className="rounded-2xl border border-bone-deep bg-[#fbf8f3] p-5 text-left transition hover:-translate-y-0.5 hover:border-oxblood hover:shadow-lg"
                  >
                    <span className="block font-serif text-xl">{r.title}</span>
                    <span className="mt-1 block text-sm text-charcoal/70">{r.blurb}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 'form' && fields && (
            <form onSubmit={submit} noValidate className="grid gap-4">
              <button type="button" onClick={() => setStep('route')} className="justify-self-start text-sm font-semibold underline underline-offset-4">
                ← Change who this is for ({ROUTES.find((r) => r.key === route)?.title})
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="ap-name" label="Full name" value={str('name')} onChange={set('name')} error={errors.name} autoComplete="name" required />
                <Input id="ap-email" label="Work email" type="email" value={str('email')} onChange={set('email')} error={errors.email} autoComplete="email" required />
              </div>

              {route === 'individual' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input id="ap-role" label="Role and company" value={str('role')} onChange={set('role')} autoComplete="organization-title" />
                    <Select id="ap-focus" label="Main focus" value={str('focus')} onChange={set('focus')} error={errors.focus} options={['Decision-making under pressure', 'Leading through change', 'Building team confidence', 'Working across time zones and tools', 'Something else']} />
                  </div>
                  <Select id="ap-timeline" label="When would you like to begin?" value={str('timeline')} onChange={set('timeline')} options={['As soon as possible', 'Within a month', 'Within a quarter', 'Just exploring']} />
                </>
              )}

              {route === 'team' && (
                <>
                  <Input id="ap-company" label="Company" value={str('company')} onChange={set('company')} autoComplete="organization" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select id="ap-teamSize" label="Team size" value={str('teamSize')} onChange={set('teamSize')} error={errors.teamSize} options={['4 to 6', '7 to 10', '11 to 15', '16 or more']} />
                    <Select id="ap-challenge" label="Biggest challenge" value={str('challenge')} onChange={set('challenge')} options={['Meetings feel unproductive', 'Distance between people', 'Slow decisions', 'Low confidence after change', 'Tool overload']} />
                  </div>
                  <Select id="ap-timeline" label="Ideal start" value={str('timeline')} onChange={set('timeline')} options={['Within a month', 'Within a quarter', 'Next quarter or later']} />
                </>
              )}

              {route === 'organization' && (
                <>
                  <Input id="ap-company" label="Organization" value={str('company')} onChange={set('company')} error={errors.company} autoComplete="organization" required />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select id="ap-headcount" label="Organization size" value={str('headcount')} onChange={set('headcount')} error={errors.headcount} options={['Under 250', '250 to 1,000', '1,000 to 5,000', '5,000 or more']} />
                    <Select id="ap-engagement" label="Engagement type" value={str('engagement')} onChange={set('engagement')} error={errors.engagement} options={['Executive leadership program', 'Multi-team rollout', 'Advisory retainer', 'Keynote or leadership event', 'Not sure yet']} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input id="ap-sponsor" label="Executive sponsor (name and title)" value={str('sponsor')} onChange={set('sponsor')} />
                    <Input id="ap-procurement" label="Procurement contact (optional)" value={str('procurement')} onChange={set('procurement')} />
                  </div>
                  <Select id="ap-timeline" label="Decision timeline" value={str('timeline')} onChange={set('timeline')} options={['This quarter', 'Next quarter', 'Planning for next year']} />
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-oxblood" checked={!!values.nda} onChange={(e) => setValues((p) => ({ ...p, nda: e.target.checked }))} />
                    <span>We will need an NDA before sharing details.</span>
                  </label>
                </>
              )}

              <div className="field">
                <label htmlFor="ap-message">What would you like us to know? (optional)</label>
                <textarea id="ap-message" rows={4} value={str('message')} onChange={(e) => set('message')(e.target.value)} />
              </div>

              <div className="grid gap-3 rounded-2xl bg-bone-deep/60 p-4 text-sm">
                <label className="flex items-start gap-3">
                  <input id="ap-privacy" type="checkbox" className="mt-1 h-4 w-4 accent-oxblood" checked={!!values.privacy} onChange={(e) => setValues((p) => ({ ...p, privacy: e.target.checked }))} aria-invalid={!!errors.privacy} />
                  <span>I have read the <a className="font-semibold underline" href={`${base.replace(/\/$/, '')}/privacy/`}>privacy notice</a>. <span aria-hidden="true">*</span></span>
                </label>
                {errors.privacy && <p className="err text-xs text-[#a02121]" role="alert">{errors.privacy}</p>}
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-oxblood" checked={!!values.marketing} onChange={(e) => setValues((p) => ({ ...p, marketing: e.target.checked }))} />
                  <span>Optional: send me occasional articles. I can unsubscribe at any time.</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary mt-2 justify-self-start">Send application</button>
            </form>
          )}

          {step === 'done' && route && (
            <div className="py-4" role="status">
              <p className="font-serif text-2xl">Your application is in.</p>
              <p className="mt-3 text-charcoal/80">{summary[route]}</p>
              <p className="mt-5 rounded-xl bg-bone-deep px-4 py-3 text-sm">Reference: <strong>{ref}</strong> (demo)</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`${base.replace(/\/$/, '')}/book-a-call/`} className="btn btn-primary">Book a call now</a>
                <button type="button" onClick={close} className="btn btn-ghost">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
