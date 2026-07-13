import type { Metadata } from "next"; import { appConfig } from "@gymchallenge/config"; import "./globals.css";
export const metadata:Metadata={title:{default:appConfig.name,template:`%s | ${appConfig.name}`},description:"Asistencias, retos y progreso para tu gimnasio"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
