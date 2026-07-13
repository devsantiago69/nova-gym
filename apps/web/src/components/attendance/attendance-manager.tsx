"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, CheckCircle2, Clock3, ImagePlus, MapPin, ShieldCheck, Trophy, X } from "lucide-react";

type Attendance = { id:string; localDate:string; status:string; startedAt:string; finishedAt:string|null; durationMinutes:number|null; photos:Array<{id:string;type:string}>; pointMovements:Array<{amount:number}> };

export function AttendanceManager({initial}:{initial:Attendance[]}) {
  const [rows]=useState(initial);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState<string>();
  const [fileName,setFileName]=useState("");
  const [inputKey,setInputKey]=useState(0);
  const active=rows.find(row=>row.status==="IN_PROGRESS");
  const points=rows.flatMap(row=>row.pointMovements).reduce((total,point)=>total+point.amount,0);

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);

  function choosePhoto(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    if(preview)URL.revokeObjectURL(preview);
    setPreview(file?URL.createObjectURL(file):undefined);
    setFileName(file?.name??"");
    setMessage("");
  }

  function clearPhoto(){if(preview)URL.revokeObjectURL(preview);setPreview(undefined);setFileName("");setInputKey(key=>key+1);}

  async function send(event:React.FormEvent<HTMLFormElement>,url:string){
    event.preventDefault();setBusy(true);setMessage("Obteniendo ubicación precisa…");
    try{
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
      const data=new FormData(event.currentTarget);data.set("latitude",String(position.coords.latitude));data.set("longitude",String(position.coords.longitude));data.set("accuracy",String(position.coords.accuracy));
      setMessage(`Ubicación confirmada (precisión ${Math.round(position.coords.accuracy)} m). Procesando evidencia…`);
      const response=await fetch(url,{method:"POST",body:data});const result=await response.json() as {message:string;errors?:Array<{message:string}>};setBusy(false);setMessage(response.ok?result.message:(result.errors?.[0]?.message??result.message));if(response.ok)location.reload();
    }catch{setBusy(false);setMessage(location.protocol==="https:"?"Activa el permiso de ubicación en tu navegador e intenta nuevamente.":"El GPS requiere HTTPS. Estamos pendientes de activar gym.dotaly.io.");}
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card p-5"><Trophy className="text-lime-400"/><p className="mt-3 text-3xl font-black">{points}</p><p className="muted">Puntos recientes</p></div>
      <div className="card p-5"><CheckCircle2 className="text-lime-400"/><p className="mt-3 text-3xl font-black">{rows.filter(row=>row.status==="COMPLETED").length}</p><p className="muted">Entrenamientos</p></div>
      <div className="card p-5"><Clock3 className="text-lime-400"/><p className="mt-3 text-3xl font-black">{active?"Activo":"Listo"}</p><p className="muted">Estado de hoy</p></div>
    </div>

    <form onSubmit={event=>send(event,active?`/api/v1/attendances/${active.id}/finish`:"/api/v1/attendances")} className="card overflow-hidden">
      <div className="grid lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5 p-5 sm:p-7">
          <div><span className="rounded-full bg-lime-400/15 px-3 py-1 text-xs font-bold text-lime-300">{active?"ENTRENAMIENTO ACTIVO":"NUEVA ASISTENCIA"}</span><h2 className="mt-4 text-3xl font-black">{active?"Finaliza con tu evidencia":"Registra tu entrenamiento"}</h2><p className="mt-2 muted">{active?"Toma la fotografía final después de mínimo 15 minutos.":"Toma una fotografía clara antes de comenzar."}</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="flex gap-3 rounded-xl bg-slate-950 p-4"><MapPin className="shrink-0 text-lime-400"/><div><strong>Ubicación precisa</strong><p className="text-sm muted">Solo al iniciar y finalizar</p></div></div><div className="flex gap-3 rounded-xl bg-slate-950 p-4"><ShieldCheck className="shrink-0 text-lime-400"/><div><strong>Evidencia privada</strong><p className="text-sm muted">Visible solo para ti</p></div></div></div>
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-lime-500/60 p-4 font-bold transition hover:bg-lime-400/5"><Camera className="text-lime-400"/><span>{preview?"Cambiar fotografía":"Abrir cámara o galería"}</span><input key={inputKey} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" required className="sr-only" onChange={choosePhoto}/></label>
          <button className="btn w-full py-4 text-base" disabled={busy||!preview}>{busy?"Procesando…":active?"Finalizar y ganar 1 punto":"Confirmar e iniciar entrenamiento"}</button>
          {message&&<p role="status" className="rounded-xl bg-slate-950 p-3 text-sm text-lime-300">{message}</p>}
        </div>
        <div className="relative min-h-[340px] border-t border-slate-800 bg-slate-950 lg:border-l lg:border-t-0">
          {preview?<><Image src={preview} alt="Vista previa de la evidencia" fill unoptimized className="object-contain"/><button type="button" onClick={clearPhoto} aria-label="Quitar fotografía" className="absolute right-4 top-4 z-10 rounded-full bg-slate-950/85 p-3"><X/></button><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-5 pt-12 text-sm"><strong>Vista previa lista</strong><p className="truncate muted">{fileName}</p></div></>:<div className="grid h-full min-h-[340px] place-content-center px-6 text-center"><ImagePlus className="mx-auto h-14 w-14 text-slate-600"/><p className="mt-4 font-bold">Tu fotografía aparecerá aquí</p><p className="mt-1 text-sm muted">Puedes revisarla y cambiarla antes de enviarla.</p></div>}
        </div>
      </div>
    </form>

    <section><h2 className="mb-4 text-2xl font-black">Historial</h2><div className="space-y-3">{rows.length===0?<div className="card p-6 muted">Aún no tienes entrenamientos registrados.</div>:rows.map(row=><article key={row.id} className="card flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-bold">{new Date(row.localDate).toLocaleDateString("es-CO",{timeZone:"UTC",dateStyle:"long"})}</p><p className="muted">{row.status==="COMPLETED"?`${row.durationMinutes} minutos`:row.status}</p></div><div className="flex gap-2">{row.photos.map(photo=><a className="rounded-lg border border-slate-700 px-3 py-2 text-sm" key={photo.id} href={`/api/v1/attendance-photos/${photo.id}`} target="_blank" rel="noreferrer">Foto {photo.type==="START"?"inicial":"final"}</a>)}</div></article>)}</div></section>
  </div>;
}
