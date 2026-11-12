"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { money } from "@/lib/api";
import { Photo } from "./product";
import { Button, SectionHeader } from "./ui";

export type LookbookPiece = {
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  alt: string;
};

export function Lookbook({ pieces }: { pieces: LookbookPiece[] }) {
  const [selection, setSelection] = useState(0);
  const piece = pieces[selection] ?? pieces[0];
  if (!piece) return null;

  return <section className="home-section editorial-chapter" id="lookbook">
    <SectionHeader kicker="IN DETAIL" title="The detail study"/>
    <div className="lookbook">
      <figure className="lookbook-image" key={piece.slug}>
        <Photo src={piece.image} alt={piece.alt} sizes="(max-width: 760px) 100vw, 56vw"/>
        <figcaption>FIG. {String(selection + 1).padStart(2, "0")} <span/> DESK EQUIPMENT</figcaption>
      </figure>
      <div className="lookbook-content">
        <div className="lookbook-select" role="group" aria-label="Pieces in the edit">
          {pieces.map((item, i) => <button key={item.slug} type="button" aria-pressed={item.slug === piece.slug}
            aria-controls="lookbook-product" onClick={() => setSelection(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>{item.name}<ArrowUpRight size={14}/>
          </button>)}
        </div>
        <div id="lookbook-product">
          <div aria-live="polite">
            <div key={piece.slug} className="lookbook-detail">
              <h3>{piece.name}</h3><p>{piece.description}</p><strong>From {money(piece.price)}</strong>
            </div>
          </div>
          <Button asChild variant="outline"><Link href={`/products/${piece.slug}`}>View product <ArrowUpRight size={16}/></Link></Button>
        </div>
      </div>
    </div>
  </section>;
}
