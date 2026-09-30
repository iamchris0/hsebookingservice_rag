"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Search, X } from "lucide-react"
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

// Lists longer than this get a search box in the dropdown header
const SEARCH_THRESHOLD = 8

export function MultiSelectFilter({ placeholder, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const searchable = options.length > SEARCH_THRESHOLD

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
    if (!open) setQuery("")
  }, [open, searchable])

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label)
  const visibleOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const hasSelection = selected.length > 0
  const showHeader = searchable || hasSelection

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 h-9 pl-3 w-[220px] rounded-full border bg-white text-sm text-left transition-colors ${
          hasSelection ? "border-[#2300fa] pr-14" : "border-border pr-3"
        }`}
      >
        <span className={`truncate flex-1 ${hasSelection ? "text-black" : "text-muted-foreground"}`}>
          {hasSelection ? selectedLabels[0] : placeholder}
        </span>
        {selectedLabels.length > 1 && (
          <span className="flex-shrink-0 rounded-full bg-[#DCFF05] px-1.5 text-[11px] font-semibold leading-5 text-black">
            +{selectedLabels.length - 1}
          </span>
        )}
        {!hasSelection && (
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </button>

      {/* Clear without opening — sits over the trigger, outside it to keep buttons un-nested */}
      {hasSelection && (
        <>
          <button
            onClick={() => onChange([])}
            title="Сбросить"
            className="absolute z-20 right-7 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-[#2300fa] hover:bg-gray-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className="absolute right-2.5 top-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform"
            style={{ transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}
          />
        </>
      )}

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-[300px] bg-white border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
            {/* Sticky header: search + selection summary */}
            {showHeader && (
              <div className="flex-shrink-0 border-b border-gray-100 p-2 space-y-2">
                {searchable && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="w-full h-8 pl-8 pr-3 rounded-full bg-gray-50 border border-gray-200 text-sm outline-none focus:border-[#2300fa] transition-colors"
                    />
                  </div>
                )}
                {hasSelection && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-500">
                      Выбрано: <span className="font-semibold text-black">{selected.length}</span>
                    </span>
                    <button
                      onClick={() => onChange([])}
                      className="text-xs font-medium text-[#2300fa] hover:underline"
                    >
                      Сбросить
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto py-1">
              {visibleOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">
                  {options.length === 0 ? "Нет вариантов" : "Ничего не найдено"}
                </p>
              ) : (
                visibleOptions.map((option) => (
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
            </div>
          </div>
        </>
      )}
    </div>
  )
}
