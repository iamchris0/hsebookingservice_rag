"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { canonicalName, filterSuggestions } from "@/lib/education-options"
import { cn } from "@/lib/utils"

interface SuggestInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}

// Free text input that suggests existing values. On blur the value is cleaned
// of extra spaces and snapped to an existing spelling that differs only in case.
export function SuggestInput({ id, value, onChange, options, placeholder, disabled }: SuggestInputProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const suggestions = filterSuggestions(options, value)
  const showList = open && suggestions.length > 0

  const select = (option: string) => {
    onChange(option)
    setOpen(false)
    setHighlighted(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter" && showList && highlighted >= 0) {
      e.preventDefault()
      select(suggestions[highlighted])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlighted(-1) }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          const cleaned = canonicalName(options, value)
          if (cleaned !== value) onChange(cleaned)
        }}
      />
      {showList && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((option, i) => (
            <button
              key={option}
              type="button"
              // mousedown, not click: fires before the input's blur closes the list
              onMouseDown={(e) => { e.preventDefault(); select(option) }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn("w-full text-left px-3 py-2 text-sm", i === highlighted && "bg-gray-100")}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
