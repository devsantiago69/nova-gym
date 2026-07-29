import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { appConfig } from "@gymchallenge/config";

export const metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05080d] text-slate-300">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-lime-300 hover:underline">
          <ArrowLeft size={16} /> Volver
        </Link>
        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-lime-500/30 bg-lime-400/10 px-4 py-3 text-lime-300">
          <Dumbbell size={20} />
          <strong>{appConfig.name}</strong>
        </div>
        <h1 className="mt-8 text-4xl font-black text-white">Política de privacidad</h1>
        <p className="mt-2 text-sm text-slate-500">Última actualización: 28 de julio de 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-lime-300">1. Qué información recolectamos</h2>
            <p className="mt-3">
              Para operar {appConfig.name} recolectamos: datos de cuenta (nombre, nombre de usuario, correo
              electrónico y, si lo compartes, tu número de WhatsApp); evidencia de tus entrenamientos
              (fotografías de inicio y fin de cada sesión); y, únicamente si activas esa opción en tu perfil,
              tu ubicación aproximada al iniciar y finalizar un entrenamiento. También registramos tu actividad
              dentro de la app (asistencias, retos, racha, experiencia y nivel) para mostrarte tu progreso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">2. Cómo protegemos tus fotografías y ubicación</h2>
            <p className="mt-3">
              Tus fotografías de evidencia son privadas por defecto: solo se comparten con los participantes de
              un reto en el que decidas participar, únicamente para validar tu entrenamiento. Tu ubicación es
              completamente opcional, se solicita solo al iniciar/finalizar un entrenamiento cuando la activas,
              y puedes desactivarla en cualquier momento desde tu perfil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">3. Publicidad</h2>
            <p className="mt-3">
              {appConfig.name} muestra anuncios de <strong className="text-white">Google AdSense</strong> para
              mantener la aplicación disponible de forma gratuita. Google y sus socios publicitarios pueden usar
              cookies u otras tecnologías similares para mostrar anuncios relevantes según tu actividad en este
              y otros sitios web. No compartimos tu correo, tus fotografías ni tu ubicación con estos socios
              publicitarios.
            </p>
            <p className="mt-3">
              Puedes conocer cómo Google usa esta información y ajustar tus preferencias de anuncios en{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-cyan-300 hover:underline"
              >
                policies.google.com/technologies/ads
              </a>{" "}
              y en{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-cyan-300 hover:underline"
              >
                adssettings.google.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">4. Cookies</h2>
            <p className="mt-3">
              Usamos cookies estrictamente necesarias para mantener tu sesión iniciada. Los anuncios de Google
              AdSense pueden agregar sus propias cookies de publicidad, sujetas a la política descrita arriba.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">5. Tus derechos</h2>
            <p className="mt-3">
              Puedes acceder, corregir o eliminar tu información desde los ajustes de tu perfil, o solicitando
              la eliminación completa de tu cuenta escribiéndonos. Conforme a la Ley 1581 de 2012 de Colombia
              (protección de datos personales), puedes ejercer en cualquier momento tus derechos de conocer,
              actualizar, rectificar y suprimir tus datos personales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">6. Contacto</h2>
            <p className="mt-3">
              Si tienes preguntas sobre esta política, escríbenos a{" "}
              <a href="mailto:contacto@dotaly.io" className="font-bold text-cyan-300 hover:underline">
                contacto@dotaly.io
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
