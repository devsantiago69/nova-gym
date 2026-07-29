import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { appConfig } from "@gymchallenge/config";

export const metadata = { title: "Términos de uso" };

export default function TermsPage() {
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
        <h1 className="mt-8 text-4xl font-black text-white">Términos de uso</h1>
        <p className="mt-2 text-sm text-slate-500">Última actualización: 28 de julio de 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-lime-300">1. Aceptación</h2>
            <p className="mt-3">
              Al crear una cuenta o usar {appConfig.name} aceptas estos términos y nuestra{" "}
              <Link href="/privacidad" className="font-bold text-cyan-300 hover:underline">
                política de privacidad
              </Link>
              . Si no estás de acuerdo, no debes usar la aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">2. Qué es {appConfig.name}</h2>
            <p className="mt-3">
              {appConfig.name} es una aplicación para registrar tu asistencia al gimnasio con evidencia
              fotográfica, participar en retos con otros usuarios, y ganar experiencia (XP) y niveles por tu
              constancia. El acceso base a la aplicación es gratuito y se sostiene, entre otras formas, mediante
              publicidad de terceros (ver sección 6).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">3. Tu cuenta</h2>
            <p className="mt-3">
              Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que
              ocurra en tu cuenta. Debes proporcionar información veraz al registrarte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">4. Contenido que subes</h2>
            <p className="mt-3">
              Las fotografías de evidencia que subas deben corresponder a tu propio entrenamiento. Nos
              reservamos el derecho de invalidar evidencia fraudulenta o contenido que viole estos términos, y
              de suspender cuentas que abusen del sistema de retos, racha o experiencia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">5. Puntos, XP y niveles</h2>
            <p className="mt-3">
              Los puntos, la experiencia (XP), los niveles y las posiciones en el ranking son elementos de
              gamificación sin valor monetario, no son transferibles ni canjeables por dinero, y pueden ajustarse
              o reiniciarse en cualquier momento a discreción de {appConfig.name}.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">6. Publicidad y patrocinios</h2>
            <p className="mt-3">
              Mostramos anuncios de Google AdSense y podemos mostrar anuncios de otros socios publicitarios en
              el futuro. No somos responsables del contenido de los anuncios de terceros ni de los sitios a los
              que redirigen. Ver más detalle en nuestra{" "}
              <Link href="/privacidad" className="font-bold text-cyan-300 hover:underline">
                política de privacidad
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">7. Planes pagos</h2>
            <p className="mt-3">
              {appConfig.name} ofrece planes opcionales de pago con beneficios adicionales. El uso básico de la
              aplicación no requiere pago. Los precios y beneficios de cada plan se muestran dentro de la
              aplicación y pueden cambiar con aviso previo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">8. Terminación</h2>
            <p className="mt-3">
              Puedes dejar de usar {appConfig.name} y solicitar la eliminación de tu cuenta en cualquier
              momento. Podemos suspender o cerrar cuentas que violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">9. Limitación de responsabilidad</h2>
            <p className="mt-3">
              {appConfig.name} se ofrece &quot;tal cual&quot;. No garantizamos que la aplicación esté libre de
              errores o interrupciones, y no somos responsables por lesiones derivadas de tus entrenamientos:
              consulta a un profesional de la salud antes de iniciar cualquier rutina de ejercicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">10. Cambios a estos términos</h2>
            <p className="mt-3">
              Podemos actualizar estos términos ocasionalmente. Publicaremos la fecha de la última actualización
              en esta misma página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-lime-300">11. Contacto</h2>
            <p className="mt-3">
              Escríbenos a{" "}
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
