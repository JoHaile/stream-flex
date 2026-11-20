"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
  )
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
  )
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close data-slot="sheet-close" {...props} />
  )
}

function SheetOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: "left" | "right"
  /** Keep the popup mounted while closed so its internal state survives. */
  keepMounted?: boolean
  /**
   * Size and clip the panel to the nearest positioned ancestor (the player
   * window) instead of the whole viewport, so the drawer matches a half-screen
   * player instead of covering the page behind it.
   */
  contained?: boolean
  /** Portal target; pair it with `contained` (e.g. the player frame element). */
  container?: HTMLElement | null
}) {
  const {
    keepMounted = false,
    contained = false,
    container,
    ...popupProps
  } = props
  const sideClasses = contained
    ? // Contained means it lives inside the player frame, where a sideways
      // slide would start clipped outside the frame and read as a jump. A plain
      // fade (held with fill-mode-both from the very first paint) never moves or
      // resizes the panel, so it cannot flash at a wrong width or position.
      `${side === "right" ? "right-0" : "left-0"} data-open:animate-in data-open:fade-in-0 data-open:fill-mode-both data-closed:animate-out data-closed:fade-out-0`
    : side === "right"
      ? "right-0 data-open:animate-in data-open:slide-in-from-right data-open:fill-mode-both data-closed:animate-out data-closed:slide-out-to-right"
      : "left-0 data-open:animate-in data-open:slide-in-from-left data-open:fill-mode-both data-closed:animate-out data-closed:slide-out-to-left"

  return (
    <SheetPortal keepMounted={keepMounted} container={container}>
      <SheetOverlay
        className={
          // Contained: dim only the player, not the page. Phones fall back to
          // the full-viewport drawer, where the video is too short to host it.
          contained ? "absolute inset-0 max-sm:fixed" : undefined
        }
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          contained
            ? // A fixed width (instead of w-full + max-w) keeps the panel's size
              // independent of the frame's box, so it never lays out wide first
              // and then shrink to its final size.
              "absolute inset-y-0 z-50 h-full w-[28rem] max-w-full border-l border-zinc-800 bg-zinc-950 shadow-2xl max-sm:fixed max-sm:w-full"
            : "fixed top-0 z-50 h-full w-full max-w-md border-l border-zinc-800 bg-zinc-950 shadow-2xl",
          sideClasses,
          className
        )}
        {...popupProps}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold text-white">
              Seasons & Episodes
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-red-500">
              <XIcon className="h-3.5 w-3.5" />
              Close
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetPortal }
