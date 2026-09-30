"use client"

import { useEffect, useState } from "react"

// Site palette used as data colors (validated as a CVD-safe pair)
export const BLUE = "#2300fa"
export const PINK = "#ff1ef7"
export const BLUE_TINT = "#d9d4ff"
export const PINK_TINT = "#ffd6fd"

// Sequential blue ramp, light → dark, for ordered buckets
export const BLUE_RAMP = ["#b8b0ff", "#6f5cff", "#2300fa"]

// Diagonal hatch — secondary encoding for "same series, weaker state"
export function hatch(color: string, tint: string, angle = 45) {
  return `repeating-linear-gradient(${angle}deg, ${color} 0 2px, ${tint} 2px 6px)`
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Flips to true on the frame after mount so CSS transitions animate from their initial state. */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}

/** Animates a number from 0 to `target` with an ease-out curve. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

/** Russian plural: plural(5, ["группа", "группы", "групп"]) → "групп" */
export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 ${className}`}
    >
      <div>
        <h2 className="text-base font-bold text-black">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export function LegendItem({ swatch, label }: { swatch: React.CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="w-3 h-3 rounded-[3px] flex-shrink-0" style={swatch} />
      {label}
    </span>
  )
}
