"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SelectOption } from "@/utils/catalog"

interface FilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  label?: string
}

const triggerClass =
  "rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-700 focus-visible:ring-red-500 data-[size=sm]:h-auto data-[size=sm]:min-h-0 data-placeholder:text-zinc-400"

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  label,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </span>
      ) : null}
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next ?? "")}
      >
        <SelectTrigger size="sm" aria-label={ariaLabel} className={triggerClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-xs focus:bg-zinc-800 focus:text-white"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
