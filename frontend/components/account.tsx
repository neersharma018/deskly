"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, message } from "@/lib/api";
import type { Address, Order, Product, User } from "@/lib/types";
import { ProductCard } from "./product";
import { addressFrom, AddressFields, OrderDetails } from "./shopping";
import { Button, Empty } from "./ui";

export function AccountProfile({ user }: { user: User }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const adjusted = sessionStorage.getItem("deskly:cart-adjustment");
    if (adjusted) {
      sessionStorage.removeItem("deskly:cart-adjustment");
      setNote("Your guest bag was adjusted for available stock: " + adjusted);
    }
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    try { await api("/me", "PATCH", data); setNote("Profile updated."); router.refresh(); }
    catch (error) { setNote(message(error)); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await api("/auth/logout", "POST"); window.location.assign("/"); }
    catch (error) { setNote(message(error)); setBusy(false); }
  }
  return <div className="panel form-stack"><h2>Profile</h2><form method="post" onSubmit={save} className="form-stack">
    <label className="field">Full name<input name="name" defaultValue={user.name} required minLength={2} maxLength={100}/></label>
    <label className="field">Email address<input defaultValue={user.email} readOnly/></label>
    <Button disabled={busy}>Save profile</Button></form>
    <div className="button-row"><Button variant="outline" disabled={busy} onClick={logout}>Sign out</Button><Link className="inline-link" href="/forgot-password">Reset password</Link></div>
    {note && <p className="form-note" role="status">{note}</p>}</div>;
}

type SavedAddress = Address & { id: string };
export function AddressBook({ initial, user }: { initial: SavedAddress[]; user: User }) {
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = addressFrom(event.currentTarget);
    const id = editing && editing !== "new" ? editing.id : null;
    setBusy(true);
    try {
      const row = await api<SavedAddress>(id ? "/me/addresses/" + id : "/me/addresses", id ? "PATCH" : "POST", data);
      setAddresses(id ? addresses.map(a => a.id === id ? row : a) : [...addresses, row]);
      setEditing(null);
      setNote("Address saved.");
    } catch (error) { setNote(message(error)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    try { await api("/me/addresses/" + id, "DELETE"); setAddresses(addresses.filter(a => a.id !== id)); setEditing(null); setNote("Address removed."); }
    catch (error) { setNote(message(error)); } finally { setBusy(false); }
  }
  return <div className="stack">{addresses.map(a => <article className="panel" key={a.id}><h3>{a.name}</h3><p>{a.line1}{a.line2 && ", " + a.line2}<br/>{a.city}, {a.state} {a.postal_code}</p>
    <div className="button-row mt-3"><Button variant="outline" disabled={busy} onClick={() => {setNote(""); setEditing(a);}}>Edit address</Button><Button variant="ghost" disabled={busy} onClick={() => remove(a.id)}>Remove address</Button></div></article>)}
    {!editing && <div><Button disabled={busy} onClick={() => {setNote(""); setEditing("new");}}>Add address</Button></div>}
    {editing && <form method="post" className="panel form-stack" onSubmit={save}><h2>{editing === "new" ? "New address" : "Edit address"}</h2><AddressFields key={editing === "new" ? "new" : editing.id} address={editing === "new" ? user : editing}/>
      <div className="button-row"><Button disabled={busy}>Save address</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div></form>}
    {note && <p className="form-note" role="status">{note}</p>}</div>;
}

export function Wishlist({ initial }: { initial: Product[] }) {
  const [items, setItems] = useState(initial);
  return items.length ? <div className="products">{items.map(product => <ProductCard key={product.id} product={product} saved onRemoved={() => setItems(previous => previous.filter(p => p.id !== product.id))}/>)}</div> :
    <Empty title="No saved products">Tap the heart on any product to save it here.</Empty>;
}

export function CustomerOrder({ initial }: { initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setNote("");
    setBusy(true);
    try { setOrder(await api<Order>(`/me/orders/${order.id}/cancel`, "POST")); }
    catch (error) { setNote(message(error)); }
    finally { setBusy(false); }
  }
  return <div className="stack"><OrderDetails order={order}/>
    {(order.status === "PENDING_PAYMENT" || order.status === "PLACED") && <div className="button-row">
      {order.status === "PENDING_PAYMENT" && <Button asChild><Link href="/checkout">Resume checkout</Link></Button>}
      {["CREATED", "DUE", "NOT_REQUIRED"].includes(order.payment) && <Button variant="outline" disabled={busy} onClick={cancel}>{order.payment_method === "DEMO" ? "Cancel demo order" : "Cancel unpaid order"}</Button>}</div>}
    {note && <p className="alert" role="alert">{note}</p>}</div>;
}
