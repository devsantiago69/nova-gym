"use client";

import { useEffect, useState } from "react";
import styles from "./login-loader.module.css";

const MESSAGES = [
  "Verificando tus credenciales…",
  "Protegiendo tu progreso…",
  "Preparando tu racha…",
  "Casi listo…",
];

export function LoginLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setMessageIndex((value) => (value + 1) % MESSAGES.length),
      950,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.stage}>
        <div>
          <div className={styles.container}>
            <div className={`${styles.dot} ${styles.dot1}`} />
            <div className={`${styles.dot} ${styles.dot2}`} />
            <div className={`${styles.dot} ${styles.dot3}`} />
          </div>
          <svg width={0} height={0}>
            <defs>
              <filter id="nova-goo-loader">
                <feGaussianBlur result="blur" stdDeviation={10} in="SourceGraphic" />
                <feColorMatrix
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"
                  mode="matrix"
                  in="blur"
                />
              </filter>
            </defs>
          </svg>
        </div>
        <p className={styles.label}>{MESSAGES[messageIndex]}</p>
      </div>
    </div>
  );
}
