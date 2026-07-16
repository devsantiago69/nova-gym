"use client";

import Image from "next/image";
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
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
  const [menu, setMenu] = useState(false);

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
      setMenu(false);
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
    if (response.ok) {
      setVisible(false);
      setMenu(false);
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="group relative h-28 w-28 shrink-0 rounded-full bg-gradient-to-br from-lime-300 via-cyan-300 to-violet-400 p-[3px] shadow-[0_20px_60px_rgba(163,230,53,.2)] sm:h-32 sm:w-32">
        <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border-4 border-slate-950 bg-slate-900">
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
          onClick={() => setMenu((value) => !value)}
          aria-label="Opciones de foto de perfil"
          className="absolute -bottom-1 -right-1 grid h-11 w-11 place-items-center rounded-full border-4 border-slate-950 bg-lime-400 text-slate-950 shadow-xl transition hover:scale-105 disabled:opacity-60"
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
      {menu ? (
        <div className="absolute left-1/2 top-[calc(100%+12px)] z-30 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-2 text-left shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-white/5"
          >
            <ImagePlus size={17} className="text-lime-300" />
            {visible ? "Elegir otra foto" : "Añadir foto"}
          </button>
          {visible ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10"
            >
              <MoreHorizontal size={17} />
              Quitar foto actual
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="absolute left-1/2 top-[calc(100%+14px)] z-20 w-max max-w-[240px] -translate-x-1/2 rounded-full border border-lime-300/20 bg-slate-950/95 px-3 py-2 text-center text-[10px] font-bold text-lime-200 shadow-xl"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
