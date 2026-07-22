import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { appConfig } from "@gymchallenge/config";
import { LocaleRuntime } from "@/components/i18n/locale-runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s | ${appConfig.name}` },
  description: "Asistencias, retos y progreso para tu gimnasio",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#070b12",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await cookies()).get("nova_locale")?.value;
  const lang = locale === "en" ? "en" : "es";
  return (
    <html lang={lang}>
      <body>
        <LocaleRuntime locale={lang} />
        {children}
      </body>
    </html>
  );
}
