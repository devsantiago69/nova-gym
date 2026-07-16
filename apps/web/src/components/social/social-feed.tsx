"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Dumbbell,
  Flame,
  LockKeyhole,
  MessageCircle,
  PartyPopper,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { SocialFeedItem } from "@/modules/social/feed";

const reactionOptions = [
  ["FIRE", Flame, "Fuego", "text-orange-300"],
  ["STRONG", Dumbbell, "Fuerza", "text-cyan-300"],
  ["APPLAUSE", PartyPopper, "Grande", "text-yellow-300"],
  ["INSPIRE", Sparkles, "Inspira", "text-violet-300"],
] as const;

function relativeDate(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function Avatar({
  url,
  name,
  size = "h-11 w-11",
}: {
  url: string | null;
  name: string;
  size?: string;
}) {
  return (
    <span
      className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 font-black text-slate-950`}
    >
      {name.charAt(0).toUpperCase()}
      {url ? (
        <Image
          src={url}
          alt={`Foto de ${name}`}
          fill
          unoptimized
          className="object-cover"
        />
      ) : null}
    </span>
  );
}

export function SocialFeed({
  initial,
  compact = false,
}: {
  initial: SocialFeedItem[];
  compact?: boolean;
}) {
  const [posts, setPosts] = useState(initial);
  const [busy, setBusy] = useState<string>();
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  useEffect(() => setPosts(initial), [initial]);
  const visible = compact ? posts.slice(0, 4) : posts;

  async function react(postId: string, type: string) {
    setBusy(`${postId}:reaction`);
    const response = await fetch(`/api/v1/social/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (response.ok)
      setPosts((current) =>
        current.map((post) => {
          if (post.id !== postId) return post;
          const previous = post.myReaction;
          const same = previous === type;
          const reactions = { ...post.reactions };
          if (previous)
            reactions[previous] = Math.max(0, (reactions[previous] ?? 0) - 1);
          if (!same) reactions[type] = (reactions[type] ?? 0) + 1;
          return {
            ...post,
            reactions,
            myReaction: same ? null : (type as typeof post.myReaction),
          };
        }),
      );
    setBusy(undefined);
  }

  async function comment(postId: string) {
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    setBusy(`${postId}:comment`);
    const response = await fetch(`/api/v1/social/posts/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = (await response.json()) as {
      data?: SocialFeedItem["comments"][number];
    };
    if (response.ok && json.data) {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, json.data!] }
            : post,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    }
    setBusy(undefined);
  }

  async function changeAudience(postId: string, audience: string) {
    setBusy(`${postId}:privacy`);
    const response = await fetch(`/api/v1/social/posts/${postId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audience }),
    });
    if (response.ok)
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, audience: audience as typeof post.audience }
            : post,
        ),
      );
    setBusy(undefined);
  }

  if (!visible.length)
    return (
      <section className="rounded-[28px] border border-dashed border-slate-700 bg-slate-900/40 p-9 text-center">
        <UsersRound className="mx-auto h-11 w-11 text-slate-600" />
        <h2 className="mt-4 text-xl font-black">
          Tu feed está listo para comenzar
        </h2>
        <p className="mt-2 text-sm muted">
          Los entrenamientos tuyos y de tus amigos aparecerán aquí.
        </p>
      </section>
    );

  return (
    <div className="space-y-5">
      {visible.map((post) => {
        const totalReactions = Object.values(post.reactions).reduce(
          (sum, count) => sum + count,
          0,
        );
        const photo = post.attendance?.photos.at(-1);
        return (
          <article
            key={post.id}
            className="overflow-hidden rounded-[30px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-[0_20px_70px_rgba(0,0,0,.18)]"
          >
            <header className="flex items-start gap-3 p-4 sm:p-5">
              <Avatar url={post.author.avatarUrl} name={post.author.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <strong className="truncate">{post.author.name}</strong>
                  <BadgeCheck size={15} className="shrink-0 text-cyan-300" />
                </div>
                <p className="truncate text-xs text-slate-400">
                  @{post.author.username} · {relativeDate(post.createdAt)}
                </p>
              </div>
              {post.isOwn ? (
                <label className="relative">
                  <span className="sr-only">Privacidad</span>
                  <select
                    disabled={busy === `${post.id}:privacy`}
                    value={post.audience}
                    onChange={(event) =>
                      void changeAudience(post.id, event.target.value)
                    }
                    className="appearance-none rounded-full border border-slate-700 bg-slate-950 py-2 pl-3 pr-8 text-[10px] font-black text-slate-300"
                  >
                    <option value="PRIVATE">Solo yo</option>
                    <option value="FRIENDS">Amigos</option>
                    {post.challenge ? (
                      <option value="CHALLENGE_TEAM">Equipo</option>
                    ) : null}
                    {post.club ? <option value="CLUB">Club</option> : null}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-2.5 text-slate-500"
                  />
                </label>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-2 text-[9px] font-black text-slate-400">
                  {post.audience === "CHALLENGE_TEAM" || post.audience === "CLUB" ? (
                    <UsersRound size={12} />
                  ) : (
                    <ShieldCheck size={12} />
                  )}{" "}
                  {post.audience === "CHALLENGE_TEAM"
                    ? "EQUIPO"
                    : post.audience === "CLUB"
                      ? "CLUB"
                      : "AMIGOS"}
                </span>
              )}
            </header>
            <div className="px-4 pb-4 sm:px-5">
              <p className="text-lg font-black">
                {post.content ||
                  (post.type === "WORKOUT"
                    ? "Entrenamiento completado"
                    : "Nuevo logro desbloqueado")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {post.attendance ? (
                  <span className="rounded-full bg-lime-400/10 px-3 py-1.5 font-bold text-lime-300">
                    <Dumbbell size={13} className="mr-1 inline" />
                    {post.attendance.durationMinutes ?? 0} minutos
                  </span>
                ) : null}
                {post.challenge ? (
                  <span className="rounded-full bg-orange-400/10 px-3 py-1.5 font-bold text-orange-200">
                    <Flame size={13} className="mr-1 inline" />
                    {post.challenge.name}
                  </span>
                ) : null}
                {post.club ? (
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 font-bold text-cyan-200">
                    <UsersRound size={13} className="mr-1 inline" />
                    {post.club.name}
                  </span>
                ) : null}
              </div>
            </div>
            {photo ? (
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <Image
                  src={photo.url}
                  alt={`Entrenamiento de ${post.author.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-[10px] font-black text-white backdrop-blur">
                    <LockKeyhole size={13} className="text-lime-300" />
                    VISIBLE SEGÚN TU PRIVACIDAD
                  </span>
                </div>
              </div>
            ) : null}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {totalReactions}{" "}
                  {totalReactions === 1 ? "reacción" : "reacciones"}
                </span>
                <span>
                  {post.comments.length}{" "}
                  {post.comments.length === 1 ? "comentario" : "comentarios"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 border-y border-slate-800 py-3">
                {reactionOptions.map(([type, Icon, label, color]) => {
                  const active = post.myReaction === type;
                  return (
                    <button
                      type="button"
                      key={type}
                      disabled={busy === `${post.id}:reaction`}
                      onClick={() => void react(post.id, type)}
                      className={`rounded-xl px-1 py-2 text-center transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <Icon
                        size={18}
                        className={`mx-auto ${active ? color : "text-slate-500"}`}
                      />
                      <span
                        className={`mt-1 block text-[9px] font-black ${active ? "text-white" : "text-slate-500"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {post.comments.length ? (
                <div className="mt-4 space-y-3">
                  {post.comments.slice(-3).map((entry) => (
                    <div key={entry.id} className="flex gap-2.5">
                      <Avatar
                        url={entry.author.avatarUrl}
                        name={entry.author.name}
                        size="h-8 w-8"
                      />
                      <p className="min-w-0 rounded-2xl bg-slate-950/70 px-3 py-2 text-sm">
                        <strong className="mr-2 text-xs">
                          {entry.author.name}
                        </strong>
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-2">
                <MessageCircle size={18} className="shrink-0 text-slate-500" />
                <input
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(event) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [post.id]: event.target.value.slice(0, 500),
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void comment(post.id);
                    }
                  }}
                  placeholder="Escribe algo que motive…"
                  className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-lime-400"
                />
                <button
                  type="button"
                  aria-label="Publicar comentario"
                  disabled={
                    !commentDrafts[post.id]?.trim() ||
                    busy === `${post.id}:comment`
                  }
                  onClick={() => void comment(post.id)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime-400 text-slate-950 disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
