import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource-variable/bodoni-moda";
import "@fontsource-variable/bodoni-moda/wght-italic.css";
import "./globals.css";
import "./storefront.css";
import { Chrome, Footer } from "@/components/chrome";
import { server } from "@/lib/server";
import type { Store } from "@/lib/types";

export const metadata: Metadata = { title: { default: "DESKLY — Make room for better work", template: "%s · DESKLY" }, description: "Thoughtful desk accessories and a catalogue-powered setup builder, designed around how you work." };

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await server<Store>("/store").catch(() => ({ sample_catalogue: false }));
  const email = process.env.STORE_SUPPORT_EMAIL?.trim();
  const phone = process.env.STORE_SUPPORT_PHONE?.trim();
  return <html lang="en"><body><Chrome sample={store.sample_catalogue}/><main id="main">{children}</main>
    <Footer year={new Date().getFullYear()} email={email} phone={phone}/></body></html>;
}
