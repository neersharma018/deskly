import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CampaignHero } from "@/components/campaign-hero";
import { DesignStories } from "@/components/design-stories";
import { Lookbook } from "@/components/lookbook";
import { Photo, ProductCard } from "@/components/product";
import { Button, SectionHeader } from "@/components/ui";
import { server, storeUnavailable } from "@/lib/server";
import { editorial, samplePhoto } from "@/lib/editorial-media";
import { money } from "@/lib/api";
import type { Category, Product, Store } from "@/lib/types";

const edit = ["slate-75-mechanical-keyboard", "rise-walnut-monitor-stand", "beam-task-lamp", "field-desk-mat"];

const presets = [
  { title: "The Focus Desk", style: "Minimal", purpose: "Coding", image: editorial.focus, alt: "A dark workspace with a keyboard and monitor" },
  { title: "The Warm Studio", style: "Natural Wood", purpose: "Content Creation", image: editorial.walnut, alt: "A monitor and laptop on a walnut desk" },
  { title: "The Daily Driver", style: "Modern", purpose: "Remote Work", image: editorial.workspace, alt: "A minimal desk with a monitor and work accessories" },
];

function WorkspaceStudies({ storeAvailable }: { storeAvailable: boolean }) {
  return <section className="wrap home-section editorial-chapter curated" id="workspace-studies">
    <SectionHeader kicker="WORKSPACE STUDIES" title="Three ways to start"/>
    <div className="curated-grid">
      {presets.map(({ title, style, purpose, image, alt }) => {
        const content = <>
          <div className="curated-photo"><Image src={image} fill alt={alt} sizes="(max-width: 760px) 100vw, 33vw"/></div>
          <div className="curated-label"><span>{purpose}</span><h3>{title}</h3>{storeAvailable && <ArrowUpRight size={19}/>}</div>
        </>;
        return storeAvailable
          ? <Link key={title} className="curated-card" href={`/setup-builder?purpose=${encodeURIComponent(purpose)}&aesthetic=${encodeURIComponent(style)}`}>{content}</Link>
          : <article key={title} className="curated-card">{content}</article>;
      })}
    </div>
    {storeAvailable && <nav className="setup-types" aria-label="Shop by setup type">
      {["Gaming", "Studying", "General Productivity"].map(purpose =>
        <Link href={`/setup-builder?purpose=${encodeURIComponent(purpose)}`} key={purpose}>{purpose}<ArrowUpRight size={15}/></Link>
      )}
    </nav>}
  </section>;
}

export default async function Home() {
  const catalogue = await Promise.all([
    server<Category[]>("/categories"), server<Product[]>("/products/featured?limit=12"), server<Store>("/store")
  ]).catch(storeUnavailable);
  if (!catalogue) {
    return <div className="editorial-home">
      <CampaignHero storeAvailable={false}/>
      <DesignStories/>
      <section className="wrap catalogue-status" id="categories">
        <h2>Shopping is temporarily unavailable.</h2>
        <p>The catalogue and Setup Builder will return when the store reconnects.</p>
      </section>
      <WorkspaceStudies storeAvailable={false}/>
    </div>;
  }
  const [categories, featured, store] = catalogue;
  const pieces = edit.flatMap(slug => {
    const product = featured.find(item => item.slug === slug);
    if (!product || product.price === null) return [];
    const photo = samplePhoto(product.image);
    return [{
      slug, name: product.name, description: product.description, price: product.price,
      image: photo?.src ?? product.image, alt: photo?.alt ?? product.images[0]?.alt ?? product.name
    }];
  });

  return <div className="editorial-home">
    <CampaignHero storeAvailable/>

    <aside className="campaign-service" aria-label="Store information">
      <div className="wrap">
        <span><i/> DESK EQUIPMENT / INDIA</span>
        <span>{store.free_shipping > 0 ? `FREE SHIPPING FROM ${money(store.free_shipping)}` : "FREE STANDARD SHIPPING"}</span>
        <span>{store.cash_on_delivery ? "CASH ON DELIVERY AVAILABLE" : "SHIPPING WITHIN INDIA"}</span>
      </div>
    </aside>

    <DesignStories/>

    <div className="wrap">
      <section className="home-section editorial-chapter" id="categories">
        <SectionHeader kicker="COLLECTIONS" title="Shop by category" href="/shop" label="View all essentials"/>
        <div className="category-grid">
          {categories.map((category, i) => <Link className="category-card" key={category.id} href={`/categories/${category.slug}`}>
            <div className="category-photo">
              <Photo src={category.image} alt="" sizes="(max-width: 760px) 50vw, 33vw"/>
              <span className="category-number">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="category-label"><h3>{category.name}</h3><ArrowUpRight size={19}/></div>
          </Link>)}
        </div>
      </section>

      <Lookbook pieces={pieces}/>

      <section className="home-section editorial-chapter studio-picks">
        <SectionHeader kicker="THE SHORTLIST" title="Everyday essentials" href="/shop" label="Shop the catalogue"/>
        {featured.length ? <div className="products">{featured.slice(0, 4).map(product => <ProductCard key={product.id} product={product}/>)}</div> :
          <p><Link className="inline-link" href="/shop">Browse the catalogue</Link></p>}
      </section>
    </div>

    <section className="builder-campaign editorial-chapter" aria-labelledby="builder-campaign-title">
      <div className="builder-campaign-photo">
        <Image src={editorial.night} alt="A warmly lit desk at night" fill sizes="100vw"/>
      </div>
      <div className="wrap builder-campaign-content">
        <div>
          <span className="eyebrow"><i/> Setup Builder</span>
          <h2 id="builder-campaign-title">Start with<br/>your desk.</h2>
          <p>Choose a budget and tell us how you work. Then build, edit, and shop a setup from the live catalogue.</p>
          <Button asChild><Link href="/setup-builder">Build your setup <ArrowUpRight size={17}/></Link></Button>
        </div>
        <ol aria-label="Setup Builder steps">
          <li><span>01</span> Set your budget</li>
          <li><span>02</span> Match your equipment</li>
          <li><span>03</span> Edit and shop the set</li>
        </ol>
      </div>
    </section>

    <WorkspaceStudies storeAvailable/>
  </div>;
}
