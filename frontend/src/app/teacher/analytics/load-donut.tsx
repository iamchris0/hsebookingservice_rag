"use client"

import { useState } from "react"
import { AssistantLoad } from "../types"
import { BLUE_RAMP, ChartCard, plural, useCountUp, useMounted } from "./chart-utils"

const SIZE = 180
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3 // px of surface between segments

export function LoadDonut({ load }: { load: AssistantLoad }) {
  const mounted = useMounted()
  const [hovered, setHovered] = useState<number | null>(null)

  const buckets = [
    { label: "Свободны", hint: "ещё без групп", value: load.free, color: BLUE_RAMP[0] },
    { label: "Частично заняты", hint: "могут взять ещё", value: load.partial, color: BLUE_RAMP[1] },
    { label: "Полностью заняты", hint: "набрали желаемое", value: load.full, color: BLUE_RAMP[2] },
  ]
  const total = buckets.reduce((s, b) => s + b.value, 0)
  const animatedTotal = useCountUp(total)
  const nonZero = buckets.filter((b) => b.value > 0).length

  let offset = 0
  const arcs = buckets.map((b) => {
    const frac = total > 0 ? b.value / total : 0
    const length = Math.max(frac * CIRCUMFERENCE - (nonZero > 1 ? GAP : 0), 0)
    const arc = { ...b, length, offset }
    offset += frac * CIRCUMFERENCE
    return arc
  })

  const center = hovered != null ? buckets[hovered] : null

  return (
    <ChartCard title="Загруженность ассистентов" subtitle="Назначенные группы относительно желаемого количества">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
            {arcs.map((a, i) =>
              a.value > 0 ? (
                <circle
                  key={a.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={hovered === i ? STROKE + 4 : STROKE}
                  strokeDasharray={`${mounted ? a.length : 0} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-a.offset}
                  className="cursor-pointer"
                  style={{
                    transition: `stroke-dasharray 900ms ease-out ${i * 150}ms, stroke-width 150ms ease, opacity 150ms ease`,
                    opacity: hovered == null || hovered === i ? 1 : 0.35,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              ) : null
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-4xl font-bold text-black tabular-nums leading-none">
              {center ? center.value : animatedTotal}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 max-w-[110px] leading-tight">
              {center
                ? center.label.toLowerCase()
                : plural(total, ["ассистент", "ассистента", "ассистентов"])}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {buckets.map((b, i) => {
            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0
            return (
              <div
                key={b.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors cursor-default ${
                  hovered === i ? "bg-gray-50" : ""
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="w-3 h-3 rounded-[3px] flex-shrink-0" style={{ backgroundColor: b.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black leading-tight">{b.label}</p>
                  <p className="text-[11px] text-gray-400">{b.hint}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="text-sm font-semibold text-black">{b.value}</p>
                  <p className="text-[11px] text-gray-400">{pct}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}
