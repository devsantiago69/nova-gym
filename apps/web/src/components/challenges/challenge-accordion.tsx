"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Compass,
  Plus,
  Trophy,
  type LucideIcon,
} from "lucide-react";

type AccordionKind = "challenges" | "create" | "explore";

const styles: Record<
  AccordionKind,
  {
    Icon: LucideIcon;
    icon: string;
    eyebrow: string;
    count: string;
    glow: string;
  }
> = {
  challenges: {
    Icon: Trophy,
    icon: "border-orange-300/20 bg-orange-300/10 text-orange-300",
    eyebrow: "text-orange-300",
    count: "border-orange-300/15 bg-orange-300/[.08] text-orange-200",
    glow: "bg-orange-400/[.06]",
  },
  create: {
    Icon: Plus,
    icon: "border-cyan-300/20 bg-cyan-300/10 text-cyan-300",
    eyebrow: "text-cyan-300",
    count: "border-cyan-300/15 bg-cyan-300/[.08] text-cyan-200",
    glow: "bg-cyan-400/[.055]",
  },
  explore: {
    Icon: Compass,
    icon: "border-violet-300/20 bg-violet-300/10 text-violet-300",
    eyebrow: "text-violet-300",
    count: "border-violet-300/15 bg-violet-300/[.08] text-violet-200",
    glow: "bg-violet-400/[.055]",
  },
};

export function ChallengeAccordion({
  id,
  kind,
  eyebrow,
  title,
  description,
  count,
  defaultOpen = false,
  children,
}: {
  id: "mis-retos" | "crear-reto" | "explorar";
  kind: AccordionKind;
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = styles[kind];
  const Icon = config.Icon;

  useEffect(() => {
    const openRequested = (event: Event) => {
      const requested = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (requested === id) setOpen(true);
    };
    window.addEventListener("nova-gym:open-challenge-section", openRequested);
    return () =>
      window.removeEventListener(
        "nova-gym:open-challenge-section",
        openRequested,
      );
  }, [id]);

  return (
    <section
      id={id}
      className={`relative mb-4 scroll-mt-32 overflow-hidden rounded-[28px] border backdrop-blur-xl transition ${open ? "border-white/[.12] bg-slate-900/85 shadow-[0_24px_75px_rgba(0,0,0,.2)]" : "border-white/[.07] bg-slate-900/60 shadow-[0_16px_48px_rgba(0,0,0,.13)]"}`}
    >
      <div
        className={`pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full blur-3xl ${config.glow}`}
      />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        onClick={() => setOpen((current) => !current)}
        className="relative flex w-full items-center gap-3 p-4 text-left sm:gap-4 sm:p-6"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border sm:h-14 sm:w-14 ${config.icon}`}
        >
          <Icon size={23} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[9px] font-black tracking-[.16em] ${config.eyebrow}`}
          >
            {eyebrow}
          </span>
          <strong className="mt-0.5 block text-xl sm:text-2xl">{title}</strong>
          <span className="mt-1 block line-clamp-1 text-xs text-slate-400 sm:text-sm">
            {description}
          </span>
        </span>
        {typeof count === "number" ? (
          <span
            className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-black sm:block ${config.count}`}
          >
            {count}
          </span>
        ) : null}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[.08] bg-slate-950/55">
          <ChevronDown
            size={19}
            className={`text-slate-400 transition duration-300 ${open ? "rotate-180 text-white" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div
          id={`${id}-content`}
          className="relative border-t border-white/[.06] p-3 sm:p-5"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
