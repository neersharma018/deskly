"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, RotateCcw, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api, message, money } from "@/lib/api";
import type { Category, Preferences, SavedSetup, Selection, Setup } from "@/lib/types";
import { Photo } from "./product";
import { Button } from "./ui";

export const purposes = ["Coding", "Gaming", "Studying", "Remote Work", "Content Creation", "General Productivity"];
export const aesthetics = ["Minimal", "Dark", "Warm", "RGB", "Modern", "Natural Wood"];
const colours = ["Graphite", "Ivory", "Sage", "Sand", "Walnut", "Silver"];
const equipment = [["monitor", "Monitor"], ["laptop", "Laptop"], ["keyboard", "Keyboard"], ["mouse", "Mouse"], ["laptop-stand", "Laptop stand"], ["monitor-stand", "Monitor stand"]];
const defaults: Preferences = { budget: 800000, purpose: "Coding", aesthetic: "Minimal", colors: [], required: [], existing: [], width_cm: null, depth_cm: null, wireless: false, quiet: false, notes: "" };

function Chips({ name, title, options, values }: { name: string; title: string; options: string[][]; values: string[] }) {
  return <fieldset><legend>{title}</legend><div className="choice-row">{options.map(([id, label]) =>
    <label className="choice" key={id}><input type="checkbox" name={name} value={id} defaultChecked={values.includes(id)}/>{label}</label>)}</div></fieldset>;
}

export function Builder({ categories, purpose, aesthetic, saved }: { categories: Category[]; purpose?: string; aesthetic?: string; saved?: SavedSetup }) {
  const router = useRouter();
  const started = useRef(false);
  const reduced = useReducedMotion();
  const [prefs, setPrefs] = useState<Preferences>(saved?.preferences || { ...defaults,
    purpose: purposes.includes(purpose || "") ? purpose! : defaults.purpose,
    aesthetic: aesthetics.includes(aesthetic || "") ? aesthetic! : defaults.aesthetic });
  const [budget, setBudget] = useState(prefs.budget / 100);
  const [setup, setSetup] = useState<Setup>();
  const [name, setName] = useState(saved?.name || "");
  const [savedId, setSavedId] = useState(saved?.id);
  const [busy, setBusy] = useState(Boolean(saved));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!saved) return;
    api<Selection>("/builder/selection", "POST", { preferences: saved.preferences, variant_ids: saved.variant_ids })
      .then(result => setSetup({ ...result, title: saved.explanation.title || saved.name,
        description: saved.explanation.description || "Your saved catalogue selection.", source: saved.explanation.source || "deterministic" }))
      .catch(error => setError(message(error))).finally(() => setBusy(false));
  }, [saved]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const next: Preferences = { budget: Number(fields.get("budget")) * 100, purpose: String(fields.get("purpose")),
      aesthetic: String(fields.get("aesthetic")), colors: fields.getAll("colors").map(String), required: fields.getAll("required").map(String),
      existing: fields.getAll("existing").map(String), width_cm: Number(fields.get("width_cm")) || null,
      depth_cm: Number(fields.get("depth_cm")) || null, wireless: fields.has("wireless"), quiet: fields.has("quiet"), notes: String(fields.get("notes") || "") };
    await perform(async () => {
      const result = await api<Setup>("/builder/recommend", "POST", next);
      setPrefs(next);
      setSetup(result);
      setName(saved?.name || result.title);
    });
  }

  async function perform(action: () => Promise<void>) {
    setError(""); setNotice(""); setBusy(true);
    try { await action(); }
    catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }

  async function refresh(ids: string[]) {
    if (!setup) return;
    const result = await api<Selection>("/builder/selection", "POST", { preferences: prefs, variant_ids: ids });
    setSetup({ ...setup, ...result });
  }

  async function add() {
    if (!setup) return;
    const ids = setup.items.map(i => i.id);
    await perform(async () => {
      try {
        await api("/builder/add-to-cart", "POST", { preferences: prefs, variant_ids: ids, expected_total: setup.subtotal });
        window.dispatchEvent(new Event("deskly:update"));
        setNotice("Setup added to your bag.");
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) await refresh(ids).catch(() => {});
        throw error;
      }
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup) return;
    await perform(async () => {
      try {
        const result = await api<SavedSetup>(savedId ? "/me/setups/" + savedId : "/me/setups", savedId ? "PATCH" : "POST",
          { name, preferences: prefs, variant_ids: setup.items.map(i => i.id), run_id: setup.id });
        setSavedId(result.id);
        setNotice("Setup saved to your account.");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setError("Sign in to save your setup. Keep this tab open and return after signing in.");
          return;
        }
        throw error;
      }
    });
  }

  return <div className="split">
    <form method="post" className="panel form-stack" onSubmit={generate} onFocus={() => {
      if (!started.current) {
        started.current = true;
        api("/builder/start", "POST").catch(() => {});
      }
    }}><h2>Make it yours</h2>
      <div className="form-grid"><label className="field wide">Maximum product budget <output>{money(budget * 100)}</output>
        <input type="range" name="budget" min={3000} max={50000} step={100} value={budget} onChange={e => setBudget(Number(e.target.value))}/></label>
        <label className="field">Primary purpose<select name="purpose" defaultValue={prefs.purpose}>{purposes.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="field">Aesthetic<select name="aesthetic" defaultValue={prefs.aesthetic}>{aesthetics.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <Chips name="required" title="Required categories" options={categories.map(c => [c.slug, c.name])} values={prefs.required}/>
      <Chips name="colors" title="Preferred colours" options={colours.map(c => [c, c])} values={prefs.colors}/>
      <Chips name="existing" title="Equipment you already own" options={equipment} values={prefs.existing}/>
      <div className="form-grid"><label className="field">Desk width (cm)<input type="number" name="width_cm" min={30} max={300} defaultValue={prefs.width_cm ?? ""} placeholder="Optional"/></label>
        <label className="field">Desk depth (cm)<input type="number" name="depth_cm" min={20} max={200} defaultValue={prefs.depth_cm ?? ""} placeholder="Optional"/></label></div>
      <div className="choice-row"><label className="choice"><input type="checkbox" name="wireless" defaultChecked={prefs.wireless}/>Wireless keyboard and mouse</label><label className="choice"><input type="checkbox" name="quiet" defaultChecked={prefs.quiet}/>Quiet keyboard</label></div>
      <label className="field">Notes for your saved setup<textarea name="notes" rows={2} maxLength={400} defaultValue={prefs.notes}/></label>
      <Button disabled={busy}>{setup ? <RotateCcw size={16}/> : <Sparkles size={16}/>} {busy ? "Checking the catalogue…" : setup ? "Regenerate setup" : "Generate setup"}</Button>
    </form>
    <section className="panel stack" aria-live="polite">
      {error && <div className="alert" role="alert">{error} {error.startsWith("Sign in") && <a className="inline-link" href="/login" target="_blank" rel="noreferrer">Open sign-in</a>}</div>}
      {notice && <p className="form-note" role="status">{notice} {notice.includes("bag") && <Link href="/cart">View bag</Link>}</p>}
      {setup ? <motion.div className="stack" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="eyebrow"><i/>{setup.source === "ai" ? "AI-ASSISTED EXPLANATION" : "CATALOGUE-MATCHED SETUP"}</span>
        <div><h2>{setup.title}</h2><p className="fine">{setup.description}</p></div>
        {setup.warnings.map(warning => <p className="form-note" key={warning}>{warning}</p>)}
        {!setup.items.length && <p>No items match your selection. Adjust your preferences and generate again.</p>}
        {setup.items.map(item => <article className="line" key={item.id}>
          <div className="line-photo"><Photo src={item.image} slug={item.slug} alt="" sizes="75px"/></div>
          <div><Link className="inline-link" href={`/products/${item.slug}`}>{item.product}</Link><p className="fine">{item.name} · {money(item.price)}</p><p className="fine">{item.reason}</p>
            {(setup.alternatives[item.category]?.length || 0) > 0 && <label className="field mt-1"><span className="sr-only">Replace {item.product}</span>
              <select value="" disabled={busy} onChange={e => { if (e.target.value) perform(() => refresh(setup.items.map(i => i.id === item.id ? e.target.value : i.id))); }}>
                <option value="">Replace item</option>{setup.alternatives[item.category].map(option => <option key={option.id} value={option.id}>{option.product} · {option.name} · {money(option.price)}</option>)}</select></label>}</div>
          <button className="icon-button" aria-label={`Remove ${item.product}`} disabled={busy} onClick={() => perform(() => refresh(setup.items.filter(i => i.id !== item.id).map(i => i.id)))}><Trash2 size={16}/></button>
        </article>)}
        <dl className="totals"><div className="total"><dt>Product total</dt><dd>{money(setup.subtotal)}</dd></div><div><dt>Budget remaining</dt><dd>{money(setup.remaining)}</dd></div><div><dt>Shipping estimate</dt><dd>{money(setup.estimates.shipping)}</dd></div><div><dt>Tax estimate</dt><dd>{money(setup.estimates.tax)}</dd></div></dl>
        <Button disabled={busy || !setup.items.length} onClick={add}><ShoppingBag size={16}/> Add setup to bag <ArrowRight size={16}/></Button>
        <form method="post" className="form-stack" onSubmit={save}><label className="field">Setup name<input minLength={2} maxLength={100} required value={name} onChange={e => setName(e.target.value)}/></label><Button variant="outline" disabled={busy || !setup.items.length}><Bookmark size={16}/>{savedId ? "Update saved setup" : "Save setup"}</Button></form>
        {saved && <Button variant="ghost" disabled={busy} onClick={() => perform(async () => { await api("/me/setups/" + saved.id, "DELETE"); router.push("/account/setups"); router.refresh(); })}>Delete saved setup</Button>}
      </motion.div> : <div><Sparkles size={24}/><h2 className="mt-3">Your setup appears here</h2><p className="fine">We’ll match items from the live catalogue to your product budget, equipment and available desk space.</p></div>}
    </section>
  </div>;
}
