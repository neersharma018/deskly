import Image from "next/image";
import { workspaceEdition } from "@/lib/editorial-media";

export function DesignStories() {
  return <>
    <section className="assembly-story editorial-chapter" aria-labelledby="assembly-title">
      <div className="wrap design-spread">
        <figure className="assembly-figure">
          <Image src={workspaceEdition.assembly} alt="An exploded mechanical keyboard with a metal top frame, a perforated switch plate, stacked layers and a lower housing"
            width={1680} height={1120} sizes="(max-width: 760px) 100vw, 64vw"/>
          <figcaption>Exploded view of a mechanical keyboard</figcaption>
        </figure>
        <div className="design-copy">
          <span className="eyebrow">01 / PRODUCT STUDY</span>
          <h2 id="assembly-title">Anatomy of a keystroke.</h2>
          <p>Look inside a mechanical keyboard to see how the frame, switch plate and housing fit together.</p>
          <dl className="assembly-parts">
            <div><dt>Top frame</dt><dd>Forms the edge around the keys.</dd></div>
            <div><dt>Switch plate</dt><dd>Holds the switches in alignment.</dd></div>
            <div><dt>Lower housing</dt><dd>Supports and encloses the assembly.</dd></div>
          </dl>
        </div>
      </div>
    </section>
    <section id="our-story" className="craft-story editorial-chapter" aria-labelledby="craft-title">
      <div className="wrap design-spread">
        <div className="design-copy">
          <span className="eyebrow">02 / CRAFTSMANSHIP</span>
          <h2 id="craft-title">Good work is in the details.</h2>
          <p>A bevel you can feel. A matte finish that softens the light. The way a keycap sits under your fingers. These are the details we look for in the things you use every day.</p>
        </div>
        <figure className="craft-figure">
          <Image src={workspaceEdition.craftsmanship} alt="Close-up of a mechanical keyboard corner showing sculpted keycaps, a beveled metal edge and visible case screws"
            width={1344} height={768} sizes="(max-width: 760px) 100vw, 60vw"/>
        </figure>
      </div>
    </section>
  </>;
}
