"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { editorial } from "@/lib/editorial-media";
import { Button } from "./ui";

const scenes = [
  { label: "Keystroke", image: editorial.poster, alt: "Hands at a backlit keyboard in a dark room", video: true },
  { label: "Workspace", image: editorial.workspace, alt: "Dark workspace with a monitor and desk accessories" },
  { label: "Key detail", image: editorial.detail, alt: "Close-up of the keycaps and casing of a mechanical keyboard" },
];

function DeskFilm() {
  const film = useRef<HTMLVideoElement>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const wantsPlayback = override ?? motionAllowed;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionAllowed(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const video = film.current;
    if (!video || failed) return;
    if (!wantsPlayback) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: .2 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [wantsPlayback, failed]);

  function toggle() {
    const video = film.current;
    if (!video) return;
    const play = video.paused;
    setOverride(play);
    if (play) void video.play().catch(() => {});
    else video.pause();
  }

  return <>
    <video ref={film} src={editorial.film} className={`campaign-video${hasFrame && !failed ? " has-frame" : ""}`}
      muted playsInline loop preload="none" aria-hidden="true"
      onPlaying={() => { setHasFrame(true); setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => setFailed(true)}/>
    {!failed && <button className="film-toggle" type="button" onClick={toggle} aria-label={playing ? "Pause film" : "Play film"}>
      {playing ? <Pause size={14}/> : <Play size={14}/>}
      <span>{playing ? "Pause film" : "Play film"}</span>
    </button>}
  </>;
}

export function CampaignHero({ hasLookbook }: { hasLookbook: boolean }) {
  const [selected, setSelected] = useState(0);
  const scene = scenes[selected];
  const index = String(selected + 1).padStart(2, "0");

  return <section className="campaign" aria-labelledby="campaign-title">
    <div id="campaign-scene">
      {scenes.map((item, i) => <div key={item.label}
        className={`campaign-picture campaign-picture-${i}${i === selected ? " is-current" : ""}`} aria-hidden={i !== selected}>
        <Image src={item.image} alt={item.alt} fill sizes="100vw" preload={i === 0}/>
      </div>)}
    </div>
    {scene.video && <DeskFilm/>}
    <div className="campaign-shade" aria-hidden="true"/>

    <div className="wrap campaign-inner">
      <div className="campaign-caption" aria-hidden="true">
        <span>DESKLY / COLLECTION 01</span><span>DESK EQUIPMENT<br/>AFTER HOURS</span>
      </div>

      <div className="campaign-copy">
        <span className="eyebrow"><i/> The After Hours Edit</span>
        <h1 id="campaign-title"><span className="title-mask"><span>Make room for</span></span>{" "}
          <span className="title-mask"><em>better work.</em></span></h1>
        <p>Keyboards, task lighting and the pieces that pull your desk together.</p>
        <div className="campaign-actions">
          <Button asChild><Link href="/shop">Shop essentials <ArrowUpRight size={17}/></Link></Button>
          <Link href="/setup-builder" className="campaign-secondary">Build your setup <ArrowUpRight size={15}/></Link>
        </div>
      </div>

      <div className="campaign-index">
        <a href={hasLookbook ? "#lookbook" : "#categories"} className="campaign-scroll">
          <ArrowDown size={15}/>{hasLookbook ? "Shop the scene" : "Explore collections"}
        </a>
        <div className="campaign-selector" role="group" aria-label="Hero scenes">
          {scenes.map((item, i) => <button key={item.label} type="button" aria-controls="campaign-scene"
            aria-pressed={i === selected} onClick={() => setSelected(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>{item.label}
          </button>)}
        </div>
        <p className="campaign-counter" aria-live="polite">{index} <span>/ 03</span></p>
      </div>
    </div>
  </section>;
}
