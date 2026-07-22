"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dumbbell,
  House,
  NotebookTabs,
  Trophy,
  User,
  Users,
} from "lucide-react";

const labels = {
  es: ["Inicio", "Asistencia", "Rutinas", "Retos", "Comunidad", "Perfil"],
  en: ["Home", "Attendance", "Routines", "Challenges", "Community", "Profile"],
  pt: ["Início", "Presença", "Rotinas", "Desafios", "Comunidade", "Perfil"],
} as const;

const routes = [
  ["/inicio", House],
  ["/asistencia", Dumbbell],
  ["/rutinas", NotebookTabs],
  ["/retos", Trophy],
  ["/comunidad", Users],
  ["/perfil", User],
] as const;

export function BottomNav({
  locale = "es",
  premium = false,
}: {
  locale?: string;
  premium?: boolean;
}) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  const translated = labels[locale as keyof typeof labels] ?? labels.es;
  const items = routes.map(([href, Icon], index) => [href, translated[index], Icon] as const);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const viewport = window.visualViewport;
    let frame = 0;

    const syncPosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nav = mobileNavRef.current;
        if (!nav) return;
        const visibleTop = viewport?.offsetTop ?? 0;
        const visibleHeight = viewport?.height ?? window.innerHeight;
        const top = Math.max(0, visibleTop + visibleHeight - nav.offsetHeight);
        nav.style.top = `${Math.round(top)}px`;
        nav.style.bottom = "auto";
      });
    };

    syncPosition();
    viewport?.addEventListener("resize", syncPosition);
    viewport?.addEventListener("scroll", syncPosition);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("orientationchange", syncPosition);
    window.addEventListener("scroll", syncPosition, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", syncPosition);
      viewport?.removeEventListener("scroll", syncPosition);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("orientationchange", syncPosition);
      window.removeEventListener("scroll", syncPosition);
    };
  }, [mounted]);

  const mobileNav = (
    <nav
      ref={mobileNavRef}
      aria-label="Navegación principal"
      className={`nova-mobile-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 h-[calc(4.75rem+env(safe-area-inset-bottom))] border-t md:hidden ${premium ? "border-lime-300/20 shadow-[0_-18px_55px_rgba(34,211,238,.11)]" : "border-white/10 shadow-[0_-16px_45px_rgba(0,0,0,.34)]"}`}
    >
      <div className={`absolute inset-0 ${premium ? "bg-[linear-gradient(120deg,rgba(8,18,20,.96),rgba(5,10,24,.97),rgba(24,11,35,.96))]" : "bg-slate-950/96"}`} />
      <div className="pointer-events-auto relative mx-auto mt-1.5 grid h-[4.05rem] max-w-lg grid-cols-6 rounded-[22px] border border-white/[.06] bg-white/[.025] px-1 backdrop-blur-xl">
        {items.map(([href, label, Icon]) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition ${active ? "text-lime-300" : premium ? "text-cyan-100/75" : "text-slate-400"}`}
            >
              <span
                className={`relative grid h-8 w-10 place-items-center rounded-xl transition ${active ? premium ? "border border-lime-200/35 bg-[linear-gradient(145deg,rgba(190,242,100,.26),rgba(34,211,238,.14))] shadow-[0_0_20px_rgba(163,230,53,.22)]" : "bg-lime-300/12" : "group-hover:bg-white/[.06]"}`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                {premium && active ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-slate-950 bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
                ) : null}
              </span>
              <span className="max-w-full truncate px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {mounted ? createPortal(mobileNav, document.body) : null}

      <nav
        aria-label="Navegación principal"
        className={`sticky top-[78px] z-30 mx-auto mb-7 hidden max-w-6xl grid-cols-6 gap-2 rounded-[22px] border p-2 backdrop-blur-2xl md:grid ${premium ? "border-lime-300/15 bg-[linear-gradient(120deg,rgba(11,24,24,.78),rgba(8,15,29,.86),rgba(25,13,31,.78))] shadow-[0_18px_65px_rgba(34,211,238,.08)]" : "border-slate-800 bg-slate-950/78"}`}
      >
        {items.map(([href, label, Icon]) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-bold transition ${active ? "border-lime-400/50 bg-lime-300/10 text-lime-200 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[.04]"}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${premium ? "bg-gradient-to-br from-lime-300/15 to-cyan-300/10" : ""}`}>
                <Icon size={18} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
