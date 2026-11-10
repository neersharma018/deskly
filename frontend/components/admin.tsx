"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, message, money } from "@/lib/api";
import type { Category, Order, Product, Variant } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { OrderDetails } from "./shopping";
import { Badge, Button } from "./ui";

type Fields = FormData;
export type InventoryRow = { variant_id: string; sku: string; variant: string; product: string; on_hand: number; reserved: number; available: number };
export type Movement = { id: string; variant_id: string; delta: number; reason: string; created_at: string };
export type Coupon = { id: string; code: string; kind: string; value: number; minimum: number; maximum: number | null; usage_limit: number | null; user_limit: number | null; starts_at: string | null; expires_at: string | null; active: boolean; uses: number };
export type Metrics = { start: string; end: string; orders: number; revenue: number; average: number; statuses: Record<string, number>; daily: Record<string, number>; category_sales: Record<string, number>; bestsellers: Record<string, number>; recent: Order[]; low_stock: InventoryRow[] };

function value(fields: Fields, key: string) { return String(fields.get(key) || "").trim(); }
function optional(fields: Fields, key: string) { return value(fields, key) ? Number(fields.get(key)) : null; }
function tags(fields: Fields, key: string) { return value(fields, key).split(",").map(s => s.trim()).filter(Boolean); }

export function Table({ headings, rows }: { headings: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="fine">No records on this page.</p>;
  return <div className="table-wrap"><table className="data-table"><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function AdminForm({ title, children, submit, action = "Save" }: { title: string; children: ReactNode; submit: (fields: Fields) => Promise<void>; action?: string }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNote("");
    try { await submit(new FormData(event.currentTarget)); setFailed(false); setNote("Saved."); }
    catch (error) { setFailed(true); setNote(message(error)); }
    finally { setBusy(false); }
  }
  return <form method="post" className="panel form-stack" onSubmit={save}><h2>{title}</h2>{children}
    <Button disabled={!hydrated || busy}>{busy ? "Saving…" : action}</Button>{note && <p className={failed ? "alert" : "form-note"} role={failed ? "alert" : "status"}>{note}</p>}</form>;
}

function Field({ name, label, initial, type = "text", required = true, min, max }: { name: string; label: string; initial?: string | number | null; type?: string; required?: boolean; min?: number; max?: number }) {
  return <label className="field">{label}<input name={name} defaultValue={initial ?? ""} type={type} min={min} max={max} maxLength={type === "text" ? 500 : undefined} required={required}/></label>;
}

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="choice"><input type="checkbox" name={name} defaultChecked={checked}/>{label}</label>;
}

function parseSpecs(text: string) {
  const parsed: unknown = JSON.parse(text || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some(v => typeof v !== "string"))
    throw new Error("Specifications must be a JSON object with text values.");
  return parsed;
}

export function ProductEditor({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const [image, setImage] = useState(product?.image || "/media/fallback.svg");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setNote("");
    try {
      const data = new FormData();
      data.append("file", file);
      setImage((await api<{ url: string }>("/admin/media", "POST", data)).url);
      setNote("Image uploaded. Save the product to attach it.");
    } catch (error) { setNote(message(error)); } finally { setUploading(false); }
  }
  return <div className="stack">
    <AdminForm title={product ? "Product details" : "New product"} action="Save product" submit={async fields => {
      const result = await api<Product>(product ? "/admin/products/" + product.id : "/admin/products", product ? "PATCH" : "POST", {
        name: value(fields, "name"), slug: value(fields, "slug"), brand: value(fields, "brand"), description: value(fields, "description"),
        category_id: value(fields, "category_id"), image, gallery: value(fields, "gallery").split(/\r?\n/).map(s => s.trim()).filter(Boolean),
        specs: parseSpecs(value(fields, "specs")), aesthetics: tags(fields, "aesthetics"),
        purposes: tags(fields, "purposes"), featured: fields.has("featured"), published: fields.has("published")
      });
      if (!product) router.push("/admin/products/" + result.id);
      router.refresh();
    }}>
      <div className="form-grid"><Field name="name" label="Name" initial={product?.name}/><Field name="slug" label="Slug" initial={product?.slug}/>
        <Field name="brand" label="Brand" initial={product?.brand}/><label className="field">Category<select name="category_id" defaultValue={product?.category.id || ""} required><option value="">Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field wide">Description<textarea name="description" rows={3} defaultValue={product?.description} maxLength={1200}/></label>
        <label className="field wide">Specifications (JSON)<textarea name="specs" rows={4} defaultValue={JSON.stringify(product?.specs || {}, null, 2)}/></label>
        <Field name="aesthetics" label="Aesthetic tags, comma-separated" initial={product?.aesthetics.join(", ")} required={false}/>
        <Field name="purposes" label="Purpose tags, comma-separated" initial={product?.purposes.join(", ")} required={false}/>
        <label className="field wide">Primary image URL<input name="image" value={image} onChange={e => setImage(e.target.value)} maxLength={500} required/></label>
        <label className="field wide">Additional image URLs, one per line<textarea name="gallery" rows={3} maxLength={4000}
          defaultValue={product?.images.slice(1).map(img => img.url).join("\n")}/></label>
        <label className="field wide">Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => upload(e.target.files?.[0])}/></label></div>
      <div className="choice-row"><Check name="published" label="Published" checked={product?.published}/><Check name="featured" label="Featured" checked={product?.featured}/></div>
      {note && <p className="form-note" role="status">{note}</p>}
    </AdminForm>
    {product && <>
      {product.published && <AdminForm title="Catalogue visibility" action="Archive product" submit={async () => { await api("/admin/products/" + product.id + "/archive", "POST"); router.refresh(); }}><p className="fine">Archiving removes this product from the storefront.</p></AdminForm>}
      {product.variants.map(variant => <VariantEditor key={variant.id} variant={variant} productId={product.id}/>)}
      <VariantEditor productId={product.id}/>
    </>}
  </div>;
}

function VariantEditor({ productId, variant }: { productId: string; variant?: Variant }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const metadata = variant?.compatibility || {};
  return <AdminForm key={version} title={variant ? `Variant · ${variant.sku}` : "Add a variant"} action={variant ? "Save variant" : "Create variant"} submit={async fields => {
    await api(variant ? "/admin/variants/" + variant.id : `/admin/products/${productId}/variants`, variant ? "PATCH" : "POST", {
      sku: value(fields, "sku"), name: value(fields, "name"), color: value(fields, "color"), price: Number(fields.get("price")),
      active: fields.has("active"), compatibility: { equipment: value(fields, "equipment"), width_cm: optional(fields, "width_cm"),
        depth_cm: optional(fields, "depth_cm"), requires: tags(fields, "requires"), wireless: fields.has("wireless"), quiet: fields.has("quiet") }
    });
    if (!variant) setVersion(v => v + 1);
    router.refresh();
  }}>
    <div className="form-grid"><Field name="sku" label="SKU" initial={variant?.sku}/><Field name="name" label="Variant name" initial={variant?.name}/><Field name="color" label="Colour" initial={variant?.color}/><Field name="price" label="Price (paise)" type="number" min={100} initial={variant?.price}/>
      <Field name="equipment" label="Equipment identifier" initial={String(metadata.equipment || "")} required={false}/>
      <Field name="requires" label="Required existing equipment, comma-separated" initial={Array.isArray(metadata.requires) ? metadata.requires.join(", ") : ""} required={false}/>
      <Field name="width_cm" label="Width (cm)" type="number" min={1} max={300} initial={metadata.width_cm as number | null} required={false}/>
      <Field name="depth_cm" label="Depth (cm)" type="number" min={1} max={200} initial={metadata.depth_cm as number | null} required={false}/></div>
    <div className="choice-row"><Check name="active" label="Active" checked={variant?.active ?? true}/><Check name="wireless" label="Wireless" checked={Boolean(metadata.wireless)}/><Check name="quiet" label="Quiet" checked={Boolean(metadata.quiet)}/></div>
    {variant && <Link className="inline-link" href={`/admin/inventory?variant=${variant.id}`}>{variant.available} available · Adjust stock</Link>}
  </AdminForm>;
}

export function CategoryEditor({ category }: { category?: Category }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  return <AdminForm key={version} title={category ? category.name : "New category"} action={category ? "Save category" : "Create category"} submit={async fields => {
    await api(category ? "/admin/categories/" + category.id : "/admin/categories", category ? "PATCH" : "POST",
      Object.fromEntries(["name", "slug", "description", "image"].map(key => [key, value(fields, key)])));
    if (!category) setVersion(v => v + 1);
    router.refresh();
  }}><div className="form-grid"><Field name="name" label="Name" initial={category?.name}/><Field name="slug" label="Slug" initial={category?.slug}/>
    <Field name="description" label="Description" initial={category?.description} required={false}/><Field name="image" label="Image URL" initial={category?.image || "/media/fallback.svg"}/></div></AdminForm>;
}

export function InventoryEditor({ rows, movements, variant }: { rows: InventoryRow[]; movements: Movement[]; variant?: string }) {
  const router = useRouter();
  return <div className="stack"><div className="panel"><h2>Stock levels</h2><Table headings={["Product", "SKU", "On hand", "Reserved", "Available"]} rows={rows.map(r => [r.product + " / " + r.variant, r.sku, r.on_hand, r.reserved, r.available])}/></div>
    <AdminForm title="Adjust stock" action="Record adjustment" submit={async fields => {
      await api("/admin/inventory/adjustments", "POST", { variant_id: value(fields, "variant_id"), delta: Number(fields.get("delta")), reason: value(fields, "reason") });
      router.refresh();
    }}>
      <label className="field">Variant<select name="variant_id" required defaultValue={variant || ""}><option value="">Select a variant</option>
        {variant && !rows.some(r => r.variant_id === variant) && <option value={variant}>Selected variant · {variant}</option>}
        {rows.map(r => <option key={r.variant_id} value={r.variant_id}>{r.sku} · {r.product} · {r.variant}</option>)}</select></label>
      <Field name="delta" label="Stock change (negative to reduce)" type="number" min={-100000} max={100000}/><Field name="reason" label="Adjustment reason"/>
    </AdminForm>
    <div className="panel"><h2>Recent movements</h2><Table headings={["Variant", "Change", "Reason", "Date"]} rows={movements.map(r => [rows.find(v => v.variant_id === r.variant_id)?.sku || r.variant_id, r.delta, r.reason, new Date(r.created_at).toLocaleDateString("en-IN")])}/></div>
  </div>;
}

function dateInput(date: string | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CouponEditor({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  return <AdminForm key={version} title={coupon ? coupon.code : "New coupon"} action={coupon ? "Save coupon" : "Create coupon"} submit={async fields => {
    await api(coupon ? "/admin/coupons/" + coupon.id : "/admin/coupons", coupon ? "PATCH" : "POST", {
      code: value(fields, "code"), kind: value(fields, "kind"), value: Number(fields.get("value")), minimum: Number(fields.get("minimum")),
      maximum: optional(fields, "maximum"), usage_limit: optional(fields, "usage_limit"), user_limit: optional(fields, "user_limit"),
      starts_at: value(fields, "starts_at") ? new Date(value(fields, "starts_at")).toISOString() : null,
      expires_at: value(fields, "expires_at") ? new Date(value(fields, "expires_at")).toISOString() : null, active: fields.has("active")
    });
    if (!coupon) setVersion(v => v + 1);
    router.refresh();
  }}><div className="form-grid"><Field name="code" label="Code" initial={coupon?.code}/><label className="field">Discount type<select name="kind" defaultValue={coupon?.kind || "PERCENT"}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
    <Field name="value" label="Discount (percent or paise)" type="number" min={1} initial={coupon?.value}/>
    <Field name="minimum" label="Minimum subtotal (paise)" type="number" min={0} initial={coupon?.minimum || 0}/>
    <Field name="maximum" label="Discount cap (paise)" type="number" min={1} initial={coupon?.maximum} required={false}/>
    <Field name="usage_limit" label="Total use limit" type="number" min={1} initial={coupon?.usage_limit} required={false}/>
    <Field name="user_limit" label="Per-customer use limit" type="number" min={1} initial={coupon?.user_limit} required={false}/>
    <Field name="starts_at" label="Starts (local time)" type="datetime-local" initial={dateInput(coupon?.starts_at)} required={false}/>
    <Field name="expires_at" label="Expires (local time)" type="datetime-local" initial={dateInput(coupon?.expires_at)} required={false}/></div>
    <div className="button-row"><Check name="active" label="Active" checked={coupon?.active ?? true}/>{coupon && <span className="fine">{coupon.uses} active redemptions</span>}</div></AdminForm>;
}

export function AdminOrders({ orders }: { orders: Order[] }) {
  function download() {
    const cell = (input: string | number) => '"' + String(input).replaceAll('"', '""') + '"';
    const rows = [["Order", "Status", "Payment", "Total paise", "Created"], ...orders.map(o => [o.number, o.status, o.payment, o.pricing.total, o.created_at])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "deskly-orders.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="stack"><Table headings={["Order", "Status", "Payment", "Total"]} rows={orders.map(o => [
    <Link key={o.id} href={`/admin/orders/${o.id}`}>{o.number}</Link>, <Badge key="status" status={o.status}/>,
    <Badge key="payment" status={o.payment}/>, money(o.pricing.total)
  ])}/>{orders.length > 0 && <div><Button variant="outline" onClick={download}>Export this page as CSV</Button></div>}</div>;
}

export function FulfillmentEditor({ order }: { order: Order }) {
  const router = useRouter();
  const next: Record<string, string> = { PLACED: "PROCESSING", PAID: "PROCESSING", PROCESSING: "SHIPPED", SHIPPED: "DELIVERED" };
  const cashDue = order.payment_method === "CASH_ON_DELIVERY" && order.payment === "DUE";
  const nextStatus = cashDue || order.payment === "CAPTURED" ? next[order.status] : undefined;
  return <div className="stack"><OrderDetails order={order}/>{order.address && <div className="panel"><h2>Contact</h2><p>{order.address.email} · {order.address.phone}</p></div>}
    {nextStatus && <AdminForm title="Update fulfillment" action={`Mark ${nextStatus.toLowerCase()}`} submit={async fields => {
      await api(`/admin/orders/${order.id}/fulfillment`, "PATCH", { status: nextStatus, carrier: value(fields, "carrier"), tracking: value(fields, "tracking"), cash_collected: fields.has("cash_collected") });
      router.refresh();
    }}>
      {nextStatus === "SHIPPED" && <div className="form-grid"><Field name="carrier" label="Carrier"/><Field name="tracking" label="Tracking number"/></div>}
      {cashDue && nextStatus === "DELIVERED" && <label className="choice"><input type="checkbox" name="cash_collected" required/>Confirm collection of {money(order.pricing.total)}</label>}
    </AdminForm>}</div>;
}

export function Dashboard({ data }: { data: Metrics }) {
  return <div className="stack"><p className="fine">{data.start.slice(0, 10)} to {data.end.slice(0, 10)} · UTC · Category sales before discounts</p>
    <div className="metrics">{[["Paid revenue", money(data.revenue)], ["Orders placed", data.orders], ["Average paid order", money(data.average)]].map(([name, amount]) => <div className="panel" key={name}>{name}<strong>{amount}</strong></div>)}</div>
    <div className="panel"><h2>Recent orders</h2><AdminOrders orders={data.recent}/></div>
    <div className="panel"><h2>Low stock</h2><Table headings={["SKU", "Product", "Available"]} rows={data.low_stock.map(r => [r.sku, r.product, r.available])}/></div>
    <div className="form-grid">{[
      ["Paid sales by day", data.daily, true], ["Orders by status", data.statuses, false],
      ["Category sales", data.category_sales, true], ["Bestselling products", data.bestsellers, false]
    ].map(([title, values, currency]) => <div className="panel" key={String(title)}><h2>{String(title)}</h2>
      <Table headings={["Name", currency ? "Sales" : "Count"]} rows={Object.entries(values as Record<string, number>).map(([key, value]) => [key, currency ? money(value) : value])}/></div>)}</div>
  </div>;
}
