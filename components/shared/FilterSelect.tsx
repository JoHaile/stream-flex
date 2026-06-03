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
}

const triggerClass =
  "rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800 focus-visible:ring-red-500 data-[size=sm]:h-auto data-[size=sm]:min-h-0 data-placeholder:text-zinc-200"

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
}: FilterSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel} className={triggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 text-zinc-200 ring-zinc-700">
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
  )
}
