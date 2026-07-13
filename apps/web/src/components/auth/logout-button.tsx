"use client";
import {signOut} from "next-auth/react";
import {LogOut} from "lucide-react";
export function LogoutButton({compact=false}:{compact?:boolean}){return <button type="button" onClick={()=>signOut({callbackUrl:"/login"})} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"><LogOut size={17}/>{compact?null:"Salir"}</button>}
