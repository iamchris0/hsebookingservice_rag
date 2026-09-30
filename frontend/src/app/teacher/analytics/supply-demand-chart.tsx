"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toDisplayDiscipline } from "@/lib/disciplines"
import { DisciplineSupply } from "../types"
import { BLUE, PINK, PINK_TINT, ChartCard, LegendItem, hatch, plural, useMounted } from "./chart-utils"

const BAR_HEIGHT = 14

function Bar({
  segments,
  max,
  mounted,
  delay,
}: {
  segments: { value: number; style: React.CSSProperties }[]
  max: number
  mounted: boolean
  delay: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    // Value label rides the bar tip; bars scale within the width left after the label
    <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex gap-[2px] transition-[width] duration-700 ease-out"
          style={{
            width: mounted && max > 0 ? `calc((100% - 40px) * ${total / max})` : "0px",
            transitionDelay: `${delay}ms`,
          }}
        >
          {segments
            .filter((s) => s.value > 0)
            .map((s, i, arr) => (
              <div
                key={i}
                className={i === arr.length - 1 ? "rounded-r-[4px]" : ""}
                style={{ height: BAR_HEIGHT, flexGrow: s.value, flexBasis: 0, ...s.style }}
              />
            ))}
        </div>
      <span
        className="text-xs font-semibold text-black tabular-nums transition-opacity duration-300"
        style={{ opacity: mounted ? 1 : 0, transitionDelay: `${delay + 500}ms` }}
      >
        {total}
      </span>
    </div>
  )
}

export function SupplyDemandChart({ data }: { data: DisciplineSupply[] }) {
  const mounted = useMounted()
  const [hovered, setHovered] = useState<number | null>(null)
  // Cursor position within the hovered row; the tooltip follows it
  const [pointer, setPointer] = useState<{ x: number; width: number }>({ x: 0, width: 0 })

  const trackPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPointer({ x: e.clientX - rect.left, width: rect.width })
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.free_groups, d.p1_candidates + d.p2_candidates]))

  return (
    <ChartCard
      title="Спрос и предложение по дисциплинам"
      subtitle="Свободные группы во всех открытых курсах и ассистенты, выбравшие дисциплину"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendItem swatch={{ backgroundColor: BLUE }} label="Свободные группы" />
        <LegendItem swatch={{ backgroundColor: PINK }} label="Кандидаты — 1-й приоритет" />
        <LegendItem swatch={{ background: hatch(PINK, PINK_TINT) }} label="Кандидаты — 2-й приоритет" />
      </div>

      <div className="flex flex-col">
        {data.map((d, i) => {
          const candidates = d.p1_candidates + d.p2_candidates
          const shortage = d.free_groups > 0 && candidates < d.free_groups
          const isHovered = hovered === i
          return (
            <div
              key={d.discipline}
              className={`relative grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1.5 py-3 px-2 -mx-2 rounded-xl transition-colors ${
                isHovered ? "bg-gray-50" : ""
              } ${i > 0 ? "border-t border-gray-100" : ""}`}
              onMouseEnter={(e) => {
                trackPointer(e)
                setHovered(i)
              }}
              onMouseLeave={() => setHovered(null)}
              onMouseMove={trackPointer}
            >
              <div className="flex sm:flex-col items-center sm:items-start justify-between gap-1">
                <span className="text-sm font-semibold text-black leading-tight">
                  {toDisplayDiscipline(d.discipline)}
                </span>
                {shortage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    Мало кандидатов
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 justify-center">
                <Bar
                  segments={[{ value: d.free_groups, style: { backgroundColor: BLUE } }]}
                  max={max}
                  mounted={mounted}
                  delay={i * 90}
                />
                <Bar
                  segments={[
                    { value: d.p1_candidates, style: { backgroundColor: PINK } },
                    { value: d.p2_candidates, style: { background: hatch(PINK, PINK_TINT) } },
                  ]}
                  max={max}
                  mounted={mounted}
                  delay={i * 90 + 60}
                />
              </div>

              {/* Hover details */}
              {isHovered && (
                <div
                  style={
                    // Flip to the cursor's left near the right edge so it never overflows the card
                    pointer.x > pointer.width - 200
                      ? { right: pointer.width - pointer.x + 16 }
                      : { left: pointer.x + 16 }
                  }
                  className="absolute top-1/2 -translate-y-1/2 z-10 hidden md:block bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-semibold text-black mb-1">{toDisplayDiscipline(d.discipline)}</p>
                  <p className="text-gray-600">
                    Свободно: <span className="font-semibold text-black">{d.free_groups}</span>{" "}
                    {plural(d.free_groups, ["группа", "группы", "групп"])}
                  </p>
                  <p className="text-gray-600">
                    1-й приоритет: <span className="font-semibold text-black">{d.p1_candidates}</span>
                  </p>
                  <p className="text-gray-600">
                    2-й приоритет: <span className="font-semibold text-black">{d.p2_candidates}</span>
                  </p>
                  {d.free_groups > 0 && (
                    <p className="text-gray-600 mt-1 pt-1 border-t border-gray-100">
                      На группу:{" "}
                      <span className="font-semibold text-black">
                        {(candidates / d.free_groups).toFixed(1).replace(".", ",")}
                      </span>{" "}
                      канд.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
