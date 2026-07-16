"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, DoorOpen, LoaderCircle, UserPlus, X } from "lucide-react";

type RequestItem = { id: string; name: string; username: string };
export function ClubDetailActions({
  clubId,
  membership,
  requests,
}: {
  clubId: string;
  membership: { status: string; role: string } | null;
  requests: RequestItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const canManage =
    membership?.status === "ACTIVE" &&
    ["OWNER", "ADMIN"].includes(membership.role);
  async function action(action: string, membershipId?: string) {
    const key = membershipId ?? action;
    setBusy(key);
    setMessage("");
    const response = await fetch(`/api/v1/clubs/${clubId}/membership`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, membershipId }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(undefined);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) router.refresh();
  }
  return (
    <div className="space-y-4">
      {membership?.status === "ACTIVE" && membership.role !== "OWNER" ? (
        <button
          type="button"
          disabled={busy === "leave"}
          onClick={() => void action("leave")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 py-3.5 text-sm font-bold text-red-300"
        >
          <DoorOpen size={17} />
          Salir del club
        </button>
      ) : membership?.status === "PENDING" ? (
        <p className="rounded-2xl bg-orange-400/10 p-4 text-center text-sm font-bold text-orange-200">
          Tu solicitud está esperando aprobación.
        </p>
      ) : !membership || ["LEFT", "REJECTED"].includes(membership.status) ? (
        <button
          type="button"
          disabled={busy === "join"}
          onClick={() => void action("join")}
          className="btn w-full gap-2 py-4"
        >
          {busy === "join" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <UserPlus />
          )}
          Unirme al club
        </button>
      ) : null}
      {canManage && requests.length ? (
        <section className="rounded-[26px] border border-orange-400/20 bg-orange-400/[.05] p-4">
          <p className="text-[10px] font-black tracking-[.14em] text-orange-300">
            SOLICITUDES PENDIENTES
          </p>
          <div className="mt-3 space-y-2">
            {requests.map((request) => (
              <article
                key={request.id}
                className="flex items-center gap-3 rounded-2xl bg-slate-950/70 p-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-orange-300 to-lime-300 font-black text-slate-950">
                  {request.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {request.name}
                  </strong>
                  <small className="text-slate-500">@{request.username}</small>
                </span>
                <button
                  disabled={busy === request.id}
                  onClick={() => void action("approve", request.id)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-slate-950"
                >
                  <Check size={16} />
                </button>
                <button
                  disabled={busy === request.id}
                  onClick={() => void action("reject", request.id)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-500/10 text-red-300"
                >
                  <X size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-700 bg-slate-950 p-3 text-center text-xs font-bold text-lime-200"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
