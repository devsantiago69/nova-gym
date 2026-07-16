"use client";

import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";

export function ProfileAvatarEditor({
  userId,
  name,
  hasAvatar,
}: {
  userId: string;
  name: string;
  hasAvatar: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(0);
  const [visible, setVisible] = useState(hasAvatar);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("avatar", file);
    const response = await fetch("/api/v1/profile/avatar", {
      method: "POST",
      body: form,
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(false);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) {
      setVisible(true);
      setVersion(Date.now());
    }
    if (input.current) input.current.value = "";
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/profile/avatar", {
      method: "DELETE",
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(false);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) setVisible(false);
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div className="group relative h-28 w-28 shrink-0 rounded-[32px] bg-gradient-to-br from-lime-300 via-cyan-300 to-violet-400 p-[3px] shadow-[0_20px_60px_rgba(163,230,53,.16)] sm:h-32 sm:w-32">
        <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[29px] border-4 border-slate-950 bg-slate-900">
          {visible ? (
            <Image
              src={`/api/v1/profile/avatar/${userId}?v=${version}`}
              alt={`Foto de perfil de ${name}`}
              fill
              unoptimized
              priority
              className="object-cover"
            />
          ) : (
            <UserRound className="h-12 w-12 text-slate-500" />
          )}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-black/70">
              <LoaderCircle className="animate-spin text-lime-300" />
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          aria-label="Cambiar foto de perfil"
          className="absolute -bottom-2 -right-2 grid h-11 w-11 place-items-center rounded-2xl border-4 border-slate-950 bg-lime-400 text-slate-950 shadow-xl transition hover:scale-105 disabled:opacity-60"
        >
          <Camera size={19} />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur hover:bg-white/15"
        >
          {visible ? "CAMBIAR FOTO" : "AÑADIR FOTO"}
        </button>
        {visible ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            aria-label="Eliminar foto de perfil"
            className="grid h-8 w-8 place-items-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
      {message ? (
        <p
          role="status"
          className="flex max-w-[220px] items-center gap-1.5 text-center text-[11px] font-bold text-lime-200 sm:text-left"
        >
          <CheckCircle2 size={13} className="shrink-0" />
          {message}
        </p>
      ) : null}
    </div>
  );
}
