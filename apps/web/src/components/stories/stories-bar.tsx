"use client";
import { useEffect, useState } from "react";

export type StoryItem = {
  id: string;
  image?: string | null;
  durationMinutes?: number | null;
  createdAt: string;
};

export function StoriesBar({ items, duration = 5000 }: { items: StoryItem[]; duration?: number }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!items.length) return null;

  return (
    <div className="mb-6">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((it, i) => (
          <button key={it.id} onClick={() => { setIndex(i); setOpen(true); }} className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-lime-400 to-orange-400 p-[2px]">
              <div className="h-full w-full rounded-full bg-slate-900" />
            </div>
            <span className="mt-1 text-xs">Tú</span>
          </button>
        ))}
      </div>
      {open && (
        <StoryViewer items={items} index={index} duration={duration} onClose={() => setOpen(false)} onIndex={setIndex} />
      )}
    </div>
  );
}

function StoryViewer({ items, index, duration, onClose, onIndex }: { items: StoryItem[]; index: number; duration: number; onClose: () => void; onIndex: (i: number) => void; }) {
  const item = items[index];

  useEffect(() => {
    const t = setTimeout(() => {
      if (index < items.length - 1) onIndex(index + 1);
      else onClose();
    }, duration);
    return () => clearTimeout(t);
  }, [index, items.length, duration, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-sm opacity-70">{new Date(item.createdAt).toLocaleString()}</div>
          <div className="text-3xl font-bold">Entrenamiento</div>
          {item.durationMinutes && (
            <div className="mt-2 text-xl">{item.durationMinutes} min</div>
          )}
        </div>
      </div>
      <button onClick={onClose} className="absolute right-4 top-4 text-sm">Cerrar</button>
      <button onClick={() => onIndex(Math.max(0, index - 1))} className="absolute left-0 top-0 h-full w-1/2" />
      <button onClick={() => onIndex(Math.min(items.length - 1, index + 1))} className="absolute right-0 top-0 h-full w-1/2" />
    </div>
  );
}
