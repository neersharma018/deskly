"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Cart, User } from "@/lib/types";

export function Mark() {
  return <span className="wordmark">DESKLY<span className="wordmark-dot">.</span></span>;
}

export function Chrome({ sample }: { sample: boolean }) {
  const path = usePathname();
  const [count, setCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const update = () => {
      api<Cart>("/cart").then(cart => setCount(cart.count)).catch(() => {});
      api<User>("/me").then(() => setLoggedIn(true)).catch(() => setLoggedIn(false));
    };
    update();
    window.addEventListener("deskly:update", update);
    return () => window.removeEventListener("deskly:update", update);
  }, [path]);
  useEffect(() => {
    if (!menu && !search) return;
    function close(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenu(false);
      setSearch(false);
      document.getElementById(menu ? "menu-toggle" : "search-toggle")?.focus();
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu, search]);
  const links = [["Shop", "/shop"], ["Our Story", "/#our-story"], ["Setup Builder", "/setup-builder"]];
  return <>
    <a className="skip" href="#main">Skip to content</a>
    {sample && <div className="topbar"><span className="topbar-dot" aria-hidden="true"/>DESKLY STUDIO / SAMPLE CATALOGUE</div>}
    <header className="site-header">
      <div className="wrap nav">
        <Link aria-label="Deskly home" className="brand-link" href="/" onClick={() => { setMenu(false); setSearch(false); }}><Mark/></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([name, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
            className={path === href ? "active" : undefined}>{name}</Link>)}
        </nav>
        <nav className="nav-actions" aria-label="Shopping tools">
          <button type="button" id="search-toggle" className="icon-button" aria-label={search ? "Close search" : "Search"} aria-expanded={search} onClick={() => { setSearch(!search); setMenu(false); }}>{search ? <X size={20}/> : <Search size={20}/>}</button>
          <Link className="icon-button account-icon" aria-label="Account" href={loggedIn ? "/account" : "/login"}><UserRound size={20}/></Link>
          <Link className="icon-button wishlist-icon" aria-label="Wishlist" href="/account/wishlist"><Heart size={20}/></Link>
          <Link className="icon-button bag-icon" aria-label={`Shopping bag, ${count} items`} href="/cart"><ShoppingBag size={20}/><span>{count}</span></Link>
        </nav>
        <button type="button" id="menu-toggle" className="icon-button mobile-menu" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => { setMenu(!menu); setSearch(false); }}>{menu ? <X size={21}/> : <Menu size={21}/>}</button>
      </div>
      {menu && <nav className="mobile-links wrap" aria-label="Mobile navigation">
        {[["Home", "/"], ...links, ["Account", loggedIn ? "/account" : "/login"], ["Wishlist", "/account/wishlist"]].map(([name, href]) => <Link href={href} key={href} onClick={() => setMenu(false)}>{name}<ArrowUpRight size={16}/></Link>)}
      </nav>}
      {search && <form action="/shop" className="wrap site-search"><label className="sr-only" htmlFor="site-q">Search products</label><input id="site-q" name="q" placeholder="Search deskside essentials…" autoFocus required/><button className="button button-primary">Search</button></form>}
    </header>
  </>;
}

export function Footer({ year, email, phone }: { year: number; email?: string; phone?: string }) {
  const emailLink = email && /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(email) ? email : undefined;
  const telephone = phone?.replace(/[\s().-]/g, "");
  const phoneLink = telephone && /^\+\d{7,15}$/.test(telephone) ? telephone : undefined;
  return <footer className="footer"><div className="wrap">
    <div className="footer-content"><div><Link href="/" aria-label="Deskly home"><Mark/></Link><p>Thoughtful essentials for the space where you do your best work.</p></div>
      <div><strong>Explore</strong><Link href="/shop">Shop all</Link><Link href="/#our-story">Our Story</Link><Link href="/#categories">Categories</Link><Link href="/setup-builder">Setup Builder</Link></div>
      <div><strong>Your Deskly</strong><Link href="/account">Account</Link><Link href="/account/wishlist">Wishlist</Link><Link href="/cart">Shopping bag</Link></div>
      <div><strong>{emailLink || phoneLink ? "Contact" : "DESKLY STUDIO"}</strong>
        {emailLink && <a href={"mailto:" + emailLink}>{emailLink}</a>}
        {phoneLink && <a href={"tel:" + phoneLink}>{phone}</a>}
        <p>India · INR ₹</p>
      </div>
    </div><div className="footer-wordmark" aria-hidden="true">DESKLY</div><div className="footer-base"><span>© {year} DESKLY</span><span>MAKE ROOM FOR BETTER WORK.</span></div>
  </div></footer>;
}
