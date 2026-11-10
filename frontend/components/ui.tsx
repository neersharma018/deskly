import Link from "next/link";
import Image from "next/image";
import { Slot } from "@radix-ui/react-slot";
import { ArrowRight, PackageOpen } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { money, statusLabel } from "@/lib/api";
import type { Pricing } from "@/lib/types";

export function Button({ asChild, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "primary" | "outline" | "light" | "ghost" }) {
  const Tag = asChild ? Slot : "button";
  return <Tag className={`button button-${variant} ${className}`} {...props} />;
}

export function Empty({ title, children, href = "/shop", label = "Browse the shop" }: { title: string; children?: ReactNode; href?: string; label?: string }) {
  return <div className="empty"><PackageOpen size={32} aria-hidden /><h2>{title}</h2><p>{children}</p><Button asChild><Link href={href}>{label}<ArrowRight size={17}/></Link></Button></div>;
}

export function PageHeader({ kicker, title, children, photo }: { kicker: string; title: string; children?: ReactNode; photo?: string }) {
  return <header className={photo ? "page-header page-header-photo" : "page-header"}>
    {photo && <div className="page-header-image"><Image src={photo} alt="" fill sizes="(max-width: 760px) 100vw, 52vw" unoptimized={photo.startsWith("https://")}/></div>}
    <div className="page-header-copy"><span className="eyebrow"><i />{kicker}</span><h1>{title}</h1>{children && <p>{children}</p>}</div>
  </header>;
}

export function SectionHeader({ kicker, title, href, label }: { kicker: string; title: string; href?: string; label?: string }) {
  return <header className="section-heading"><div><span className="eyebrow"><i />{kicker}</span><h2>{title}</h2></div>{href && <Link className="text-link" href={href}>{label}<ArrowRight size={17}/></Link>}</header>;
}

export function Totals({ pricing }: { pricing: Pricing }) {
  return <dl className="totals">
    <div><dt>Subtotal</dt><dd>{money(pricing.subtotal)}</dd></div>
    <div><dt>Discount</dt><dd>{pricing.discount ? "−" + money(pricing.discount) : money(0)}</dd></div>
    <div><dt>Shipping</dt><dd>{pricing.shipping ? money(pricing.shipping) : "Free"}</dd></div>
    <div><dt>Tax</dt><dd>{money(pricing.tax)}</dd></div>
    <div className="total"><dt>Total</dt><dd>{money(pricing.total)}</dd></div>
  </dl>;
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${["PAID", "CAPTURED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status) ? "badge-green" : ""}`}>{statusLabel(status)}</span>;
}
