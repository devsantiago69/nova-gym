"use client";

import { useEffect } from "react";
import { translateSpanishText } from "@/lib/i18n/catalog";

const skippedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const translatedAttributes = ["aria-label", "placeholder", "title"] as const;

function translateElement(root: Node, locale: string) {
  if (root instanceof HTMLElement && (skippedTags.has(root.tagName) || root.dataset.noTranslate !== undefined)) return;
  if (root.nodeType === Node.TEXT_NODE && root.nodeValue) {
    const translated = translateSpanishText(root.nodeValue, locale);
    if (translated !== root.nodeValue) root.nodeValue = translated;
    return;
  }
  if (root instanceof HTMLElement) for (const attribute of translatedAttributes) {
    const current = root.getAttribute(attribute);
    if (!current) continue;
    const translated = translateSpanishText(current, locale);
    if (translated !== current) root.setAttribute(attribute, translated);
  }
  for (const child of root.childNodes) translateElement(child, locale);
}

export function LocaleRuntime({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "es";
    translateElement(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateElement(mutation.target, locale);
        if (mutation.type === "attributes") translateElement(mutation.target, locale);
        for (const node of mutation.addedNodes) translateElement(node, locale);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...translatedAttributes] });
    return () => observer.disconnect();
  }, [locale]);
  return null;
}
