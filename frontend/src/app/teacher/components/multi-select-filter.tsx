"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  placeholder: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MultiSelectFilter({ placeholder, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const label =
    selected.length === 0
      ? placeholder
      : options
          .filter((o) => selected.includes(o.value))
          .map((o) => o.label)
          .join(", ")

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 h-9 px-3 w-[220px] rounded-full border border-border bg-white text-sm text-left"
      >
        <span className={`truncate ${selected.length === 0 ? "text-muted-foreground" : "text-black"}`}>
          {label}
        </span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-[280px] max-h-72 overflow-y-auto bg-white border border-border rounded-xl shadow-lg py-1">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Нет вариантов</p>
            ) : (
              options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => toggle(option.value)}
                    className="rounded-sm"
                  />
                  <span className="text-sm text-black leading-tight">{option.label}</span>
                </label>
              ))
            )}
            {selected.length > 0 && (
              <>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => onChange([])}
                  className="w-full text-left px-3 py-2 text-sm text-[#2300fa] hover:bg-gray-50 transition-colors"
                >
                  Сбросить
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
