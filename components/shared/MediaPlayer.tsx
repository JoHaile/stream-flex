"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  info?: React.ReactNode;
};

export default function MediaPlayer({
  isOpen,
  onClose,
  title,
  children,
  info,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm landscape:bg-black landscape:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-5xl landscape:mx-0 landscape:flex landscape:h-full landscape:max-w-full landscape:items-center landscape:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl landscape:h-full landscape:max-h-screen landscape:rounded-none">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
          >
            <XIcon className="h-3.5 w-3.5" />
            Close
          </button>

          {children}

          {info ? (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
              <div className="flex items-center justify-between">{info}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
