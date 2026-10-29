"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowUpRight, ScanLine, CloudSun, Sparkles } from "lucide-react";
import Studio from "@/components/Studio";
const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: () => (
    <div className="hero-canvas">
      <img
        className="scene-fallback"
        src="/garments/glo-001.svg"
        alt="Sage cotton overshirt"
      />
    </div>
  ),
});
export default function Home() {
  const [account, setAccount] = useState(false);
  const [user, setUser] = useState("");
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Glowrify home">
          glowrify<span>✳</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#studio">Style studio</a>
          <a href="https://anywear.decart.ai/virtual-try-on" target="_blank" rel="noreferrer">Live try-on</a>
        </nav>
        <button
          className="header-cta"
          onClick={() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" })}
        >
          Start styling <ArrowUpRight size={17} />
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="pill">
              <span className="green-dot" /> PERSONAL STYLE. A LITTLE SMARTER.
            </div>
            <h1>
              Good style.
              <br />
              Great energy.
              <br />
              <em>Entirely you.</em>
            </h1>
            <p>
              Your proportions. Your plans. Your forecast.
              <br />
              Meet a personal stylist that gets the whole picture.
            </p>
            <a className="button lime" href="#studio">
              Find my style <ArrowUpRight size={20} />
            </a>
            <div className="hero-note">
              <span className="mini-orbits">✳</span>
              <span>
                A fresh perspective on getting dressed.
                <br />
                <strong>Made for real life. Made for you.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="visual-kicker">THE EVERYDAY, ELEVATED.</span>
            <HeroScene />
            <div className="floating-label label-a">
              <span className="little-icon">
                <ScanLine size={18} />
              </span>
              <div>
                Built around you<small>Proportion-aware styling</small>
              </div>
            </div>
            <div className="floating-label label-b">
              <CloudSun size={22} />
              <div>
                Forecast meets fashion<small>Looks for your kind of day</small>
              </div>
            </div>
            <span className="rotate-hint">↔ MOVE TO EXPLORE</span>
            <span className="visual-number">01 — THE NEW EVERYDAY</span>
          </div>
        </section>
        <div className="ticker">
          <span>YOUR BODY, YOUR RULES</span>
          <span>✳</span>
          <span>CONTEXT IS EVERYTHING</span>
          <span>✳</span>
          <span>CONFIDENCE LOOKS GOOD ON YOU</span>
          <span>✳</span>
          <span>GET DRESSED, FEEL GOOD</span>
        </div>
        <section id="how-it-works" className="how section-wrap">
          <div>
            <span className="eyebrow">LESS SCROLLING. MORE YOU.</span>
            <h2>
              Your next great look,
              <br />
              <em>in three easy steps.</em>
            </h2>
          </div>
          <div className="steps">
            {[
              {
                Icon: ScanLine,
                n: "01",
                title: "A little about you",
                desc: "Share your photo and a few details. Your proportions guide your edit.",
              },
              {
                Icon: CloudSun,
                n: "02",
                title: "The right kind of context",
                desc: "Your occasion and current weather help find the right pieces.",
              },
              {
                Icon: Sparkles,
                n: "03",
                title: "See it. Style it. Own it.",
                desc: "Preview your chosen garment on your photo in the fitting room.",
              },
            ].map(({ Icon, n, title, desc }) => (
              <article key={n}>
                <div className="step-top">
                  <Icon size={25} strokeWidth={1.4} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>
        <Studio
          accountOpen={account}
          openAccount={() => setAccount(true)}
          closeAccount={() => setAccount(false)}
          onUser={setUser}
        />
        <section className="closing">
          <span>✳</span>
          <h2>
            Style isn’t a set of rules.
            <br />
            <em>It’s a way to feel like yourself.</em>
          </h2>
          <a href="#studio">
            Let’s find your kind of good. <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          glowrify<span>✳</span>
        </a>
        <p>A little intelligence. A lot of personal style.</p>
        <span>© {new Date().getFullYear()} Glowrify</span>
      </footer>
    </>
  );
}
