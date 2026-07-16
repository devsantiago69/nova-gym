"use client";

import {useEffect,useState} from "react";
import {Compass,Flame,Plus,Trophy} from "lucide-react";

const items=[
  {id:"historias",label:"Historias",short:"Historias",Icon:Flame,color:"lime"},
  {id:"mis-retos",label:"Mis retos",short:"Retos",Icon:Trophy,color:"orange"},
  {id:"crear-reto",label:"Crear reto",short:"Crear",Icon:Plus,color:"cyan"},
  {id:"explorar",label:"Explorar",short:"Explorar",Icon:Compass,color:"violet"},
] as const;

export function ChallengeSectionNav({invitationCount=0}:{invitationCount?:number}){
  const [active,setActive]=useState("historias");
  useEffect(()=>{
    const sections=items.map(item=>document.getElementById(item.id)).filter((item):item is HTMLElement=>Boolean(item));
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)setActive(visible.target.id);},{rootMargin:"-90px 0px -62% 0px",threshold:[0,.15,.4,.75]});
    sections.forEach(section=>observer.observe(section));return()=>observer.disconnect();
  },[]);
  function go(id:string){setActive(id);document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});}
  return <div className="sticky top-0 z-40 -mx-4 mb-7 border-y border-slate-800/90 bg-[#070b12]/95 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#070b12]/85 sm:mx-0 sm:rounded-[22px] sm:border sm:px-2">
    <nav aria-label="Secciones de retos" className="mx-auto grid max-w-2xl grid-cols-4 gap-1.5">
      {items.map(({id,label,short,Icon,color})=>{const selected=active===id;return <button type="button" key={id} onClick={()=>go(id)} aria-current={selected?"page":undefined} className={`relative flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-black transition-all duration-200 sm:gap-2 sm:px-4 sm:text-xs ${selected?"bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_8px_22px_rgba(0,0,0,.25)]":"text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}>
        <Icon size={16} className={selected?color==="lime"?"text-lime-300":color==="orange"?"text-orange-300":color==="cyan"?"text-cyan-300":"text-violet-300":"text-slate-500"}/><span className="truncate sm:hidden">{short}</span><span className="hidden truncate sm:inline">{label}</span>
        {id==="crear-reto"&&invitationCount>0&&<span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-400 px-1 text-[9px] text-slate-950">{invitationCount}</span>}
        {selected&&<span className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full ${color==="lime"?"bg-lime-300":color==="orange"?"bg-orange-300":color==="cyan"?"bg-cyan-300":"bg-violet-300"}`}/>} 
      </button>})}
    </nav>
  </div>;
}
