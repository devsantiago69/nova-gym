import { NextResponse } from "next/server";
export function ok<T>(data:T,message="Operación realizada correctamente",status=200){return NextResponse.json({success:true,data,message,errors:null,meta:{}},{status});}
export function fail(code:string,message:string,status=400,field:string|null=null){return NextResponse.json({success:false,data:null,message:"No fue posible realizar la operación",errors:[{code,field,message}],meta:{}},{status});}
