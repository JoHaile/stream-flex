"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * shadcn's sonner wrapper. The app is dark-only (`<html class="dark">`), so the
 * theme is fixed instead of read from next-themes, which this project does not
 * use. Colours come from the same tokens as the rest of the UI.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
