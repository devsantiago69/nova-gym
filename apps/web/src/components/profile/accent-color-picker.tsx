"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  accentColors,
  getAccentColor,
  type AccentColorDef,
} from "@/lib/colors/accent-colors";

function injectPalette(color: AccentColorDef) {
  const vars = Object.entries(color.palette)
    .map(([shade, hex]) => `--color-lime-${shade}:${hex}`)
    .join(";");
  document.documentElement.style.cssText += `;${vars}`;
  document.documentElement.style.setProperty("--primary", color.hex);
}

export function AccentColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const selected = useMemo(() => getAccentColor(preview ?? value), [preview, value]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
        {(accentColors as AccentColorDef[]).map((color) => {
          const active = (preview ?? value) === color.id;
          return (
            <button
              key={color.id}
              type="button"
              title={color.name}
              onClick={() => {
                onChange(color.id);
                setPreview(null);
                injectPalette(getAccentColor(color.id));
              }}
              onMouseEnter={() => {
                setPreview(color.id);
                injectPalette(color);
              }}
              onMouseLeave={() => {
                setPreview(null);
                injectPalette(getAccentColor(value));
              }}
              className="group relative aspect-square w-full"
            >
              <span
                className={`absolute inset-0 rounded-2xl border-2 transition-all duration-200 ${
                  active
                    ? "scale-110 border-white shadow-[0_0_24px_var(--color-lime-400/0.3)]"
                    : "border-white/10 hover:scale-105 hover:border-white/30"
                }`}
                style={{ backgroundColor: color.hex }}
              />
              {active && (
                <span className="absolute inset-0 grid place-items-center">
                  <Check
                    size={16}
                    className="drop-shadow-[0_0_6px_rgba(0,0,0,.6)]"
                    style={{ color: "#000" }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="overflow-hidden rounded-[24px] border transition-colors duration-300"
        style={{
          borderColor: `${selected.hex}33`,
          backgroundColor: `${selected.hex}0d`,
        }}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-lg transition-colors duration-300"
              style={{ backgroundColor: selected.hex }}
            >
              <Sparkles
                size={24}
                className="drop-shadow-[0_0_8px_rgba(0,0,0,.4)]"
                style={{ color: "#000" }}
              />
            </span>
            <div>
              <strong className="text-lg">{selected.name}</strong>
              <code
                className="mt-1 block text-xs font-mono transition-colors duration-300"
                style={{ color: selected.hex }}
              >
                {selected.hex}
              </code>
              <p className="mt-1 text-xs text-slate-400">
                Color de acento — aparece en botones, badges y enlaces de toda
                la aplicación
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["400", "300", "200"] as const).map((shade) => (
              <span
                key={shade}
                className="h-8 w-8 rounded-lg border border-white/10 shadow-sm"
                style={{
                  backgroundColor: (selected.palette as Record<string, string>)[shade],
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
