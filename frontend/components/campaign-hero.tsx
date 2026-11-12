import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { workspaceEdition } from "@/lib/editorial-media";
import { Button } from "./ui";

export function CampaignHero({ storeAvailable }: { storeAvailable: boolean }) {
  return <section className="campaign" aria-labelledby="campaign-title">
    <div className="campaign-picture">
      <Image src={workspaceEdition.hero} alt="Sunlight falls across a walnut desk with a mechanical keyboard, monitor and plants"
        fill sizes="100vw" preload/>
    </div>
    <div className="wrap campaign-inner">
      <div className="campaign-copy">
        <span className="eyebrow">DESKLY / WORKSPACE ESSENTIALS</span>
        <h1 id="campaign-title">Make room for <em>better work.</em></h1>
        <p>Thoughtfully designed essentials for the space where ideas happen.</p>
        <div className="campaign-actions">
          <Button asChild>
            <Link href={storeAvailable ? "/shop" : "#workspace-studies"}>
              {storeAvailable ? "Explore collection" : "Explore workspaces"} <ArrowUpRight size={16}/>
            </Link>
          </Button>
          <a href="#our-story" className="campaign-secondary">Discover DESKLY</a>
        </div>
      </div>
    </div>
  </section>;
}
