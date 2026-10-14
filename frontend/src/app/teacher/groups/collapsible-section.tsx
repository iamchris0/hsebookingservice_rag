"use client"

import React from "react"

import { useLayoutEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  /** How many rows of a grid child stay visible; the rest scrolls inside the section. */
  visibleRows?: number
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  visibleRows = 2,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  // Cap the body at `visibleRows` rows of the grid. Measured from the real cards,
  // so it follows the column count on resize and cards of different heights.
  useLayoutEffect(() => {
    const container = scrollRef.current
    const grid = container?.firstElementChild as HTMLElement | null
    if (!container || !grid) return

    const measure = () => {
      if (getComputedStyle(grid).display !== "grid") {
        setMaxHeight(undefined)
        return
      }
      const rowTops = [...new Set(
        Array.from(grid.children).map((item) => (item as HTMLElement).offsetTop)
      )].sort((a, b) => a - b)

      if (rowTops.length <= visibleRows) {
        setMaxHeight(undefined)
        return
      }
      const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0
      const paddingBottom = parseFloat(getComputedStyle(container).paddingBottom) || 0
      setMaxHeight(rowTops[visibleRows] - rowGap + paddingBottom)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    Array.from(grid.children).forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [children, visibleRows])

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
        {/* relative: makes card offsetTop relative to this scroll container */}
        <div
          ref={scrollRef}
          className="relative p-4 pt-2 overflow-y-auto"
          style={{ maxHeight }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
