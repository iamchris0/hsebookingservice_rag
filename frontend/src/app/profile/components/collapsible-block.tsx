"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CollapsibleBlockProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleBlock({ title, subtitle, defaultOpen = false, children }: CollapsibleBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-bold text-black text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-gray-400 shrink-0 ml-4">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-5 pt-0 border-t border-gray-100">{children}</div>
      </div>
    </div>
  )
}
