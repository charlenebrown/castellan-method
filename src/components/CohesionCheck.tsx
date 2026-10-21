import { useRef, useState } from 'react';

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideLike>;
  }
}
type PyodideLike = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => (arg: string) => string };
};

type Part = { label: string; percent: number; level: string };
type Result = { overall: number; level: string; parts: Record<string, Part>; focus: string; nextStep: string; engine: 'python' | 'javascript' };

const PYODIDE_VERSION = '0.27.2';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const QUESTIONS = [
  { id: 'q1', text: 'My team has regular stretches of time where nobody expects a quick reply.' },
  { id: 'q2', text: 'Meetings leave people more drained than clear.' },
  { id: 'q3', text: 'Information is easy to find, and we rarely ask the same question twice.' },
  { id: 'q4', text: 'In meetings, quieter people contribute as often as louder ones.' },
  { id: 'q5', text: 'People on my team often feel like they are working alone, even when busy.' },
  { id: 'q6', text: 'We make time to talk about how we work together, not only what we work on.' },
  { id: 'q7', text: 'People share early drafts and admit mistakes without fear.' },
  { id: 'q8', text: 'When we disagree, we explain decisions and move forward together.' },
];
const SCALE = ['Rarely', 'Sometimes', 'Often', 'Usually', 'Almost always'];

// Plain JavaScript fallback, in case the Python runtime cannot load (offline, blocked CDN).
function scoreInJs(a: Record<string, number>): Result {
  const dims: Record<string, string[]> = { quiet: ['q1', 'q2', 'q3'], present: ['q4', 'q5', 'q6'], trust: ['q7', 'q8'] };
  const labels: Record<string, string> = { quiet: 'Quiet', present: 'Present', trust: 'Trust' };
  const steps: Record<string, string> = {
    quiet: 'Start with the Quiet work: cut notification noise and protect shared focus time.',
    present: 'Start with the Present work: rebuild real connection in meetings, in the room and on screen.',
    trust: 'Start with the Trust work: make confidence a shared habit through clear, repeatable team rituals.',
  };
  const level = (p: number) => (p >= 75 ? 'Strong' : p >= 50 ? 'Developing' : 'At risk');
  const parts: Record<string, Part> = {};
  for (const [name, keys] of Object.entries(dims)) {
    const vals = keys.map((k) => (k === 'q2' || k === 'q5' ? 6 - a[k] : a[k]));
    const pct = Math.round(((vals.reduce((s, v) => s + v, 0) - vals.length) / (4 * vals.length)) * 100);
    parts[name] = { label: labels[name], percent: pct, level: level(pct) };
  }
  const overall = Math.round(Object.values(parts).reduce((s, p) => s + p.percent, 0) / 3);
  const focus = Object.keys(parts).reduce((lo, k) => (parts[k].percent < parts[lo].percent ? k : lo));
  return { overall, level: level(overall), parts, focus, nextStep: steps[focus], engine: 'javascript' };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script failed'));
    document.head.appendChild(s);
  });
}

export default function CohesionCheck({ base }: { base: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const pyRef = useRef<Promise<PyodideLike> | null>(null);
  const root = base.replace(/\/$/, '');

  // Start downloading Python as soon as the visitor engages, so results feel quick.
  function warm(): Promise<PyodideLike> {
    if (!pyRef.current) {
      pyRef.current = (async () => {
        await loadScript(`${INDEX_URL}pyodide.js`);
        const py = await window.loadPyodide!({ indexURL: INDEX_URL });
        const code = await fetch(`${root}/py/cohesion_score.py`).then((r) => r.text());
        setSource(code);
        py.runPython(code);
        return py;
      })();
    }
    return pyRef.current;
  }

  function choose(id: string, value: number) {
    setAnswers((a) => ({ ...a, [id]: value }));
    void warm().catch(() => undefined);
  }

  const answered = Object.keys(answers).length;
  const complete = answered === QUESTIONS.length;

  async function run() {
    setBusy(true);
    try {
      const py = await warm();
      const fn = py.globals.get('score_json');
      setResult(JSON.parse(fn(JSON.stringify(answers))) as Result);
    } catch {
      setResult(scoreInJs(answers));
    } finally {
      setBusy(false);
      setTimeout(() => document.getElementById('cc-result')?.focus(), 50);
    }
  }

  if (result) {
    return (
      <div id="cc-result" tabIndex={-1} className="card sm:!p-10" aria-live="polite">
        <p className="eyebrow">Your result</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="font-serif text-6xl leading-none">{result.overall}<span className="text-3xl text-charcoal/50">%</span></p>
          <p className="pb-1 text-lg font-semibold text-oxblood-deep">{result.level}</p>
        </div>
        <div className="mt-8 grid gap-5">
          {Object.entries(result.parts).map(([key, p]) => (
            <div key={key}>
              <div className="mb-1.5 flex justify-between text-sm font-semibold"><span>{p.label}</span><span>{p.percent}% · {p.level}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-bone-deep" role="img" aria-label={`${p.label}: ${p.percent} percent`}>
                <div className="h-full rounded-full bg-oxblood transition-[width] duration-700" style={{ width: `${p.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-2xl bg-bone-deep/70 p-5 text-lg leading-relaxed">{result.nextStep}</p>
        <p className="mt-4 text-xs text-charcoal/60">Scored by {result.engine === 'python' ? 'Python, running in your browser with Pyodide' : 'a JavaScript fallback (Python could not load)'}. A self-assessment is a starting point, not a diagnosis.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" data-apply="team" className="btn btn-primary">Discuss with Dr. Castellan</button>
          <button type="button" onClick={() => { setResult(null); setAnswers({}); }} className="btn btn-ghost">Retake</button>
        </div>
        {source && (
          <details className="mt-8 text-sm">
            <summary className="cursor-pointer font-semibold underline underline-offset-4">See the Python that scored this</summary>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-navy p-4 text-xs leading-relaxed text-bone"><code>{source}</code></pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="card sm:!p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{answered} of {QUESTIONS.length} answered</p>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-bone-deep" aria-hidden="true">
          <div className="h-full bg-brass transition-[width] duration-300" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>
      <ol className="grid gap-8">
        {QUESTIONS.map((q, i) => (
          <li key={q.id}>
            <fieldset>
              <legend className="font-serif text-xl leading-snug"><span className="mr-2 text-brass">{i + 1}.</span>{q.text}</legend>
              <div className="mt-4 grid grid-cols-5 gap-2" role="radiogroup">
                {SCALE.map((label, idx) => {
                  const v = idx + 1;
                  const on = answers[q.id] === v;
                  return (
                    <label key={v} className={`cursor-pointer rounded-xl border px-1 py-3 text-center text-[0.7rem] font-semibold leading-tight transition focus-within:outline focus-within:outline-2 focus-within:outline-brass sm:text-xs ${on ? 'border-oxblood bg-oxblood text-bone' : 'border-charcoal/20 hover:bg-bone-deep'}`}>
                      <input type="radio" name={q.id} value={v} checked={on} onChange={() => choose(q.id, v)} className="sr-only" />
                      <span className="block text-base">{v}</span>
                      <span className="hidden sm:block">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button type="button" disabled={!complete || busy} onClick={run} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? 'Scoring with Python…' : 'See my result'}
        </button>
        {!complete && <p className="text-sm text-charcoal/60">Answer all eight to continue.</p>}
      </div>
    </div>
  );
}
