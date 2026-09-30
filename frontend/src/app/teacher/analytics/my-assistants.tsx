"use client"

import { Users, DollarSign, CreditCard } from "lucide-react"
import { MyAssistantLoad } from "../types"
import { BLUE, BLUE_TINT, ChartCard, LegendItem, hatch, plural, useMounted } from "./chart-utils"

function PaymentIcon({ type }: { type: "money" | "credits" }) {
  return type === "money" ? (
    <span title="Оплата" className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
      <DollarSign className="w-3 h-3 text-green-600" />
    </span>
  ) : (
    <span title="Кредиты" className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center">
      <CreditCard className="w-3 h-3 text-purple-600" />
    </span>
  )
}

export function MyAssistants({ assistants }: { assistants: MyAssistantLoad[] }) {
  const mounted = useMounted()
  const max = Math.max(1, ...assistants.map((a) => a.active_groups + a.pending_groups))

  return (
    <ChartCard title="Мои ассистенты" subtitle="Сколько ваших групп ведёт каждый ассистент">
      {assistants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">Ассистентов пока нет</p>
            <p className="text-xs text-gray-400 mt-0.5">Они появятся здесь после бронирования</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <LegendItem swatch={{ backgroundColor: BLUE }} label="Подтверждено" />
            <LegendItem swatch={{ background: hatch(BLUE, BLUE_TINT) }} label="Ожидает решения" />
          </div>

          <div className="flex flex-col gap-3">
            {assistants.map((a, i) => {
              const total = a.active_groups + a.pending_groups
              return (
                <div key={a.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-black truncate">
                      {a.last_name} {a.first_name}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.payment_types.map((t) => (
                        <PaymentIcon key={t} type={t} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex gap-[2px] transition-[width] duration-700 ease-out"
                      style={{
                        width: mounted ? `calc((100% - 96px) * ${total / max})` : "0px",
                        transitionDelay: `${i * 80}ms`,
                      }}
                    >
                      {[
                        { value: a.active_groups, style: { backgroundColor: BLUE } },
                        { value: a.pending_groups, style: { background: hatch(BLUE, BLUE_TINT) } },
                      ]
                        .filter((s) => s.value > 0)
                        .map((s, j, arr) => (
                          <div
                            key={j}
                            className={j === arr.length - 1 ? "rounded-r-[4px]" : ""}
                            style={{ height: 12, flexGrow: s.value, flexBasis: 0, ...s.style }}
                          />
                        ))}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      <span className="font-semibold text-black">{total}</span>{" "}
                      {plural(total, ["группа", "группы", "групп"])}
                      {a.courses > 1 && ` · ${a.courses} ${plural(a.courses, ["курс", "курса", "курсов"])}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </ChartCard>
  )
}
