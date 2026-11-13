"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ArrowUpRight, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { ApiError, api, message, money } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { samplePhoto } from "@/lib/editorial-media";
import { Button } from "./ui";

export function Photo({ src, alt, sizes = "(max-width: 640px) 50vw, 28vw", priority = false, slug }: { src: string; alt: string; sizes?: string; priority?: boolean; slug?: string }) {
  const [broken, setBroken] = useState("");
  const photo = samplePhoto(src, slug);
  const path = broken === src ? "/media/fallback.svg" : photo?.src ?? src;
  return <Image src={path} alt={alt && (photo?.alt ?? alt)} fill sizes={sizes} preload={priority}
    className={path.startsWith("/media/after-hours/") ? "editorial-photo" : undefined} unoptimized={path.startsWith("https://")} onError={() => setBroken(src)}/>;
}

export function WishlistButton({ id, initial = false, text = false, onRemoved }: { id: string; initial?: boolean; text?: boolean; onRemoved?: () => void }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const path = usePathname();
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    try {
      await api(saved ? "/me/wishlist/" + id : "/me/wishlist", saved ? "DELETE" : "POST", saved ? undefined : { product_id: id });
      setSaved(!saved);
      setNotice(saved ? "Removed from wishlist." : "Saved to wishlist.");
      if (saved) onRemoved?.();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.push("/login?next=" + encodeURIComponent(path));
      else setNotice(message(error));
    } finally { setBusy(false); }
  }
  return <><button type="button" disabled={busy} onClick={toggle} className={text ? "button button-outline" : "heart"}
    aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}><Heart size={18} fill={saved ? "currentColor" : "none"}/>{text && (saved ? "Saved" : "Save")}</button>
    {notice && <span role="status" className={text ? "form-note" : "card-notice"}>{notice}</span>}</>;
}

export function ProductCard({ product, saved, onRemoved }: { product: Product; saved?: boolean; onRemoved?: () => void }) {
  return <article className="product-card">
    <div className="product-media"><Link href={`/products/${product.slug}`} aria-label={product.name}><Photo src={product.image} slug={product.slug} alt={product.images[0]?.alt || product.name}/></Link>
      <span className={`stock-tag ${product.available ? "" : "sold"}`}>{product.available ? "In stock" : "Out of stock"}</span>
      <WishlistButton id={product.id} initial={saved} onRemoved={onRemoved}/>
    </div>
    <div className="product-info"><span className="meta">{product.category.name}</span><Link href={`/products/${product.slug}`} className="product-title">{product.name}<ArrowUpRight size={16}/></Link>
      <p>{product.price === null ? "Unavailable" : `${product.variants.length > 1 ? "From " : ""}${money(product.price)}`}</p></div>
  </article>;
}

export function ProductDetail({ product }: { product: Product }) {
  const hydrated = useHydrated();
  const [variantId, setVariant] = useState((product.variants.find(v => v.available) || product.variants[0])?.id);
  const [photo, setPhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const image = product.images[photo];
  const sample = samplePhoto(image?.url || product.image, product.slug);
  const variant = product.variants.find(v => v.id === variantId);
  const maximum = Math.min(variant?.available || 0, 99);
  async function add() {
    setBusy(true);
    try {
      await api("/cart/items", "POST", { variant_id: variantId, quantity });
      window.dispatchEvent(new Event("deskly:update"));
      setNote("Added to your bag.");
    } catch (error) { setNote(message(error)); }
    finally { setBusy(false); }
  }
  return <div className="product-detail">
    <div><div className="detail-photo"><Photo src={image?.url || product.image} slug={product.slug} alt={image?.alt || product.name} sizes="(max-width: 760px) 100vw, 50vw" priority/></div>
      {sample && <p className="fine mt-2">Representative photography for the sample catalogue.</p>}
      {product.images.length > 1 && <div className="thumbnails">{product.images.map((img, i) => <button key={img.url} type="button" onClick={() => setPhoto(i)} aria-label={`View image ${i + 1}`} aria-pressed={i === photo}><Photo src={img.url} slug={product.slug} alt=""/></button>)}</div>}</div>
    <div className="detail-content"><span className="eyebrow"><i/>{product.brand} / {product.category.name}</span><h1>{product.name}</h1><p className="detail-price">{variant ? money(variant.price) : "Unavailable"}</p><p>{product.description}</p>
      <fieldset disabled={!hydrated}><legend>Choose a variant</legend><div className="choice-row">{product.variants.map(v => <label key={v.id} className="choice"><input type="radio" name="variant" value={v.id} checked={v.id === variantId} onChange={() => {setVariant(v.id); setQuantity(1); setNote("");}}/>{v.name}{v.available === 0 ? " · Sold out" : ""}</label>)}</div></fieldset>
      <p className="stock-copy">{maximum > 0 ? `${variant?.available} available` : "Out of stock"}</p>
      <div className="detail-actions"><div className="stepper" aria-label="Quantity"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={16}/></button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Increase quantity" disabled={quantity >= maximum} onClick={() => setQuantity(quantity + 1)}><Plus size={16}/></button></div>
        <Button disabled={!hydrated || busy || !maximum} onClick={add}><ShoppingBag size={17}/>{busy ? "Adding…" : "Add to bag"}</Button><WishlistButton id={product.id} text/></div>
      {note && (note === "Added to your bag." ?
        <p role="status" className="form-note">{note} <a href="/cart">View bag</a></p> :
        <p role="alert" className="alert">{note}</p>)}
      <dl className="specs">{Object.entries(product.specs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <p className="fine">Shipping within India. Shipping and tax are calculated at checkout.</p>
    </div></div>;
}
