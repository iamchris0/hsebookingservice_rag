"use client"

import React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-black text-lg">{title}</h3>
          <span className="bg-[#DCFF05] text-black text-sm font-semibold px-3 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <div className="text-gray-500">
          {isOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}
