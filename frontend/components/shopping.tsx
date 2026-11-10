"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Trash2, Truck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, message, money } from "@/lib/api";
import type { Address, Cart, Order, PaymentMethod, Pricing, Store, User } from "@/lib/types";
import { Photo } from "./product";
import { Badge, Button, Empty, Totals } from "./ui";

export const addressFields = [
  ["name", "Full name", "name"], ["email", "Email", "email"], ["phone", "Phone", "tel"],
  ["line1", "Address line 1", "address-line1"], ["line2", "Address line 2 (optional)", "address-line2"],
  ["city", "City", "address-level2"], ["state", "State", "address-level1"], ["postal_code", "PIN code", "postal-code"]
] as const;

export function AddressFields({ address }: { address?: Partial<Address> }) {
  return <div className="form-grid">
    {addressFields.map(([name, label, autocomplete]) => <label key={name} className={`field ${name.startsWith("line") ? "wide" : ""}`}>{label}
      <input name={name} autoComplete={autocomplete} defaultValue={address?.[name]} type={name === "email" ? "email" : name === "phone" ? "tel" : "text"}
        inputMode={name === "postal_code" ? "numeric" : undefined} maxLength={name === "postal_code" ? 6 : 160} required={name !== "line2"}/></label>)}
    <label className="field">Country<input name="country" value="India" readOnly autoComplete="country-name"/></label>
  </div>;
}

export function addressFrom(form: HTMLFormElement) {
  const fields = new FormData(form);
  return Object.fromEntries([...addressFields.map(([name]) => [name, fields.get(name)]), ["country", fields.get("country")]]) as Address;
}

export function ShoppingBag() {
  const [cart, setCart] = useState<Cart>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => { api<Cart>("/cart").then(setCart).catch(error => setNote(message(error))); }, []);
  async function change(path: string, method: string, data?: unknown) {
    setBusy(true);
    setNote("");
    try {
      setCart(await api<Cart>(path, method, data));
      window.dispatchEvent(new Event("deskly:update"));
    } catch (error) { setNote(message(error)); } finally { setBusy(false); }
  }
  if (!cart) return <p role="status">{note || "Loading your bag…"}</p>;
  if (!cart.items.length) return <Empty title="Your bag is empty">Find something that makes your desk feel like yours.</Empty>;
  const canCheckout = cart.items.every(line => line.valid);
  return <div className="split">
    <section className="panel"><h2>Bag items <small>({cart.count})</small></h2>
      {cart.items.map(item => <article key={item.id} className="line">
        <div className="line-photo"><Photo src={item.image} slug={item.slug} alt="" sizes="75px"/></div>
        <div><Link className="inline-link" href={`/products/${item.slug}`}>{item.name}</Link><p className="fine">{item.variant} · {money(item.price)} each</p>
          {!item.valid && <p className="alert" role="status">Only {item.available} available.</p>}
          <div className="line-controls"><label>Qty <select aria-label={`Quantity for ${item.name}`} disabled={busy || item.available === 0} value={item.quantity}
            onChange={event => change("/cart/items/" + item.id, "PATCH", { quantity: Number(event.target.value) })}>
            {Array.from({ length: Math.max(item.quantity, Math.min(item.available, 99)) }, (_, i) => <option key={i} value={i + 1} disabled={i + 1 > item.available}>{i + 1}</option>)}
          </select></label><button className="icon-button" disabled={busy} aria-label={`Remove ${item.name}`} onClick={() => change("/cart/items/" + item.id, "DELETE")}><Trash2 size={15}/></button></div>
        </div><strong>{money(item.subtotal)}</strong></article>)}
      {note && <p className="alert" role="alert">{note}</p>}
    </section>
    <aside className="panel"><h2>Bag summary</h2><dl className="totals"><div className="total"><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div></dl><p className="fine mb-4">Shipping, tax and discounts are calculated at checkout.</p>
      {canCheckout ? <Button asChild><Link href="/checkout">Continue to checkout <ArrowRight size={17}/></Link></Button> : <p className="alert">Update unavailable items to continue.</p>}
    </aside>
  </div>;
}

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayWindow = Window & { Razorpay?: new (options: {
  key: string; order_id: string; amount: number; currency: string; name: string;
  prefill?: { name: string; email: string; contact: string }; theme: { color: string };
  handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void };
}) => { open: () => void } };
let loadingGateway: Promise<void> | undefined;

function loadGateway() {
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
  if (loadingGateway) return loadingGateway;
  loadingGateway = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Razorpay Checkout could not load. You can resume the order."));
    };
    const timeout = setTimeout(fail, 12000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = fail;
    document.head.append(script);
  }).finally(() => { loadingGateway = undefined; });
  return loadingGateway;
}

export function CheckoutForm({ store }: { store: Store }) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>();
  const [quote, setQuote] = useState<Pricing>();
  const [preferredMethod, setPreferredMethod] = useState<PaymentMethod>("RAZORPAY");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [pending, setPending] = useState<Order | null>(null);
  const [profile, setProfile] = useState<User>();
  const [addresses, setAddresses] = useState<(Address & { id: string })[]>([]);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const attempt = useRef<{ key: string; payload: string } | null>(null);
  const online = Boolean(quote?.payments_available);
  const cash = Boolean(quote?.cash_on_delivery);
  const method = online && cash ? preferredMethod : cash ? "CASH_ON_DELIVERY" : "RAZORPAY";
  useEffect(() => {
    const load = async () => {
      const [bag, order] = await Promise.all([api<Cart>("/cart"), api<Order | null>("/checkout/pending")]);
      setCart(bag);
      setPending(order);
      if (!order && bag.items.length) setQuote(await api<Pricing>("/checkout/quote", "POST", {}));
    };
    load().catch(error => setNote(message(error))).finally(() => setLoaded(true));
    api<User>("/me").then(user => { setProfile(user); return api<(Address & { id: string })[]>("/me/addresses"); }).then(setAddresses).catch(() => {});
  }, []);
  async function apply(code: string) {
    setBusy(true);
    setNote("");
    try { setQuote(await api<Pricing>("/checkout/quote", "POST", { coupon: code })); setApplied(code); }
    catch (error) { setNote(message(error)); } finally { setBusy(false); }
  }
  async function open(order: Order, address?: Address) {
    setPending(order.status === "PENDING_PAYMENT" ? order : null);
    if (!order.key || !order.gateway_order_id || order.status !== "PENDING_PAYMENT") {
      router.push("/checkout?order=" + order.id);
      return;
    }
    await loadGateway();
    const Razorpay = (window as RazorpayWindow).Razorpay;
    if (!Razorpay) throw new Error("Razorpay Checkout did not initialize.");
    const checkout = new Razorpay({
      key: order.key, order_id: order.gateway_order_id, amount: order.pricing.total, currency: "INR", name: "Deskly",
      theme: { color: "#9c5947" }, prefill: address ? { name: address.name, email: address.email, contact: address.phone } : undefined,
      modal: { ondismiss: () => { setBusy(false); setNote("Payment window closed. You can resume your pending order."); } },
      handler: async result => {
        try {
          await api("/payments/razorpay/verify", "POST", { order_id: order.id, ...result });
          window.dispatchEvent(new Event("deskly:update"));
        } catch (error) { setNote(message(error)); }
        finally { setBusy(false); router.push("/checkout?order=" + order.id); }
      }
    });
    checkout.open();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !quote || !(online || cash)) return;
    const address = addressFrom(event.currentTarget);
    setNote("");
    setBusy(true);
    try {
      const data = { address, coupon: applied, expected_total: quote.total, payment_method: method };
      const payload = JSON.stringify(data);
      if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
      const { key } = attempt.current;
      const order = await api<Order>("/checkout/orders", "POST", data, { "Idempotency-Key": key });
      attempt.current = null;
      await open(order, address);
    } catch (error) {
      const order = await api<Order | null>("/checkout/pending").catch(() => null);
      setPending(order);
      setNote(message(error));
      setBusy(false);
    }
  }
  async function resume() {
    if (!pending) return;
    setBusy(true);
    setNote("");
    try { await open(await api<Order>(`/checkout/orders/${pending.id}/resume`, "POST")); }
    catch (error) { setNote(message(error)); setBusy(false); }
  }
  if (!loaded) return <p role="status">Loading checkout…</p>;
  if (pending) return <section className="panel stack"><h2>Pending order</h2><p>{pending.number} · {money(pending.pricing.total)}</p>
    <div className="button-row"><Button disabled={busy} onClick={resume}>Resume payment</Button><Button asChild variant="outline"><Link href={"/checkout?order=" + pending.id}>Check status</Link></Button></div>{note && <p className="alert" role="alert">{note}</p>}</section>;
  if (!cart?.items.length) return note ? <p className="alert" role="alert">{note}</p> : <Empty title="Your bag is empty">Add essentials to continue to checkout.</Empty>;
  return <div className="split">
    <form method="post" className="panel form-stack" onSubmit={submit}><h2>Shipping details</h2>
      {addresses.length > 0 && <label className="field">Saved address<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Enter an address</option>{addresses.map(a => <option value={a.id} key={a.id}>{a.line1}, {a.city}</option>)}</select></label>}
      <AddressFields key={selected || profile?.id || "guest"} address={addresses.find(a => a.id === selected) || profile}/>
      {(online || cash) && <fieldset className="payment-options">
        <legend>Payment method</legend>
        {online && <label className="payment-choice"><input type="radio" name="payment_method" value="RAZORPAY"
          checked={method === "RAZORPAY"} onChange={() => setPreferredMethod("RAZORPAY")}/>
          <span><strong>Razorpay</strong><small>{store.sandbox ? "Online payment · Test mode" : "Secure online payment"}</small></span>
        </label>}
        {cash && <label className="payment-choice"><input type="radio" name="payment_method" value="CASH_ON_DELIVERY"
          checked={method === "CASH_ON_DELIVERY"} onChange={() => setPreferredMethod("CASH_ON_DELIVERY")}/>
          <span><strong>Cash on delivery</strong><small>Payment is due when your order is delivered.</small></span>
        </label>}
      </fieldset>}
      {store.sample_catalogue && (online || cash) && <p className="fine">Orders from this sample catalogue are for development.</p>}
      {quote && !(online || cash) && <p className="alert" role="status">Checkout is unavailable until a payment method is enabled.</p>}
      {note && <p className="alert" role="alert">{note}</p>}
      {(online || cash) && <Button disabled={busy}>
        {method === "CASH_ON_DELIVERY" ? <Truck size={16}/> : <LockKeyhole size={16}/>}
        {busy ? "Preparing checkout…" : method === "CASH_ON_DELIVERY" ? "Place order" : "Pay with Razorpay"}
      </Button>}
    </form>
    <aside className="panel"><h2>Order summary</h2>
      <ul className="stack mb-4">{cart.items.map(i => <li className="flex justify-between gap-3" key={i.id}><span>{i.name} × {i.quantity}<br/><small>{i.variant}</small></span><strong>{money(i.subtotal)}</strong></li>)}</ul>
      <form className="form-stack mb-4" onSubmit={event => { event.preventDefault(); apply(coupon); }}><label className="field">Coupon<input value={coupon} maxLength={32} onChange={event => setCoupon(event.target.value)} placeholder="Enter code"/></label><div className="button-row"><Button variant="outline" disabled={busy}>Apply</Button>{applied && <Button type="button" variant="ghost" onClick={() => { setCoupon(""); apply(""); }}>Remove {applied}</Button>}</div></form>
      {quote && <Totals pricing={quote}/>}
    </aside>
  </div>;
}

export function OrderDetails({ order }: { order: Order }) {
  const address = order.address;
  return <div className="split"><section className="panel stack"><h2>{order.number}</h2><div className="button-row"><Badge status={order.status}/><Badge status={order.payment === "DUE" ? "PAYMENT_DUE" : order.payment}/></div>
    {order.payment_method === "CASH_ON_DELIVERY" && <p className="fine">Cash on delivery{order.payment === "DUE" ? " · Payment is due when the order is delivered." : ""}</p>}
    {order.status === "PAYMENT_FAILED" && order.payment === "CAPTURED" && <p className="alert">Payment was captured after checkout expired. This order requires review.</p>}
    <ul>{order.items?.map((item, i) => <li className="line" key={i}><strong>{item.quantity} ×</strong><span>{item.name}<br/><small>{item.variant}</small></span><span>{money(item.quantity * item.unit_price)}</span></li>)}</ul>
    {order.shipment && <p><strong>Tracking</strong> {order.shipment.carrier} · {order.shipment.tracking}</p>}</section>
    <aside className="panel"><h2>Summary</h2><Totals pricing={order.pricing}/>
      {address && <><h3>Shipping address</h3><p>{address.name}<br/>{address.line1}{address.line2 ? ", " + address.line2 : ""}<br/>{address.city}, {address.state} {address.postal_code}<br/>India</p></>}</aside></div>;
}

export function CheckoutStatus({ id }: { id: string }) {
  const [order, setOrder] = useState<Order>();
  const [note, setNote] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let tries = 0;
    async function refresh() {
      try {
        const result = await api<Order>("/checkout/orders/" + id);
        if (stopped) return;
        setOrder(result);
        if (result.status === "PENDING_PAYMENT" && ++tries < 20) timer = setTimeout(refresh, 4000);
        else window.dispatchEvent(new Event("deskly:update"));
      } catch (error) { if (!stopped) setNote(message(error)); }
    }
    refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [id]);
  if (!order) return <p role="status">{note || "Checking your order…"}</p>;
  return <div className="stack">{order.status === "PENDING_PAYMENT" && <p className="form-note">Awaiting verified payment. This page checks for an update.</p>}
    {order.status === "PLACED" && <p className="form-note" role="status">Order placed. Payment is due on delivery.</p>}
    <OrderDetails order={order}/>
    <div className="button-row"><Button asChild variant="outline"><Link href="/checkout">Back to checkout</Link></Button><Button asChild><Link href="/shop">Continue shopping</Link></Button></div>
  </div>;
}
