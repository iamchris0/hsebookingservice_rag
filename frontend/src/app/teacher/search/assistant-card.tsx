"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, GraduationCap, BookOpen, Mail, Send } from "lucide-react"
import { SelectAssistantDialog } from "./select-assistant-dialog"
import { Assistant } from "../types"

type AssistantCardProps = Assistant

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: "#DCFF05" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: "#2300fa" }}>
          {label}
        </p>
        <p className="text-xs font-medium text-black leading-tight line-clamp-2">{value || "—"}</p>
      </div>
    </div>
  )
}

export function AssistantCard({
  name,
  skills,
  faculty,
  trainingProgram,
  email,
  telegram,
  isFavorite,
  currentAssignments,
}: AssistantCardProps) {
  const [favorite, setFavorite] = useState(isFavorite)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
        <CardContent className="px-4 pt-4 flex-1 space-y-3">

          {/* 1. Name + Star */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-black leading-tight">{name}</h3>
            <button
              onClick={() => setFavorite(!favorite)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <Star
                className={`w-5 h-5 ${favorite ? "fill-[#ff1ef7] text-[#ff1ef7]" : "text-gray-300"}`}
              />
            </button>
          </div>

          {/* 2. Priorities block */}
          <div className="bg-gray-100 rounded-xl p-3 space-y-2">
            {skills.map((skill, index) => (
              <div key={skill.number}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#DCFF05] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-black">{skill.number}</span>
                  </div>
                  <span className="text-sm text-black leading-tight">
                    {skill.name !== "—" && skill.groups != null
                      ? `${skill.name} (${skill.groups} гр.)`
                      : skill.name}
                  </span>
                </div>
                {index < skills.length - 1 && (
                  <div className="border-b border-gray-300 mt-2 ml-8" />
                )}
              </div>
            ))}
          </div>

          {/* 3. Faculty */}
          <InfoRow
            icon={<GraduationCap className="h-3.5 w-3.5 text-black" />}
            label="Факультет"
            value={faculty}
          />

          {/* 4. Educational program */}
          <InfoRow
            icon={<BookOpen className="h-3.5 w-3.5 text-black" />}
            label="Образовательная программа"
            value={trainingProgram}
          />

          {/* 5. Contact table: mail | telegram */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-1.5 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#DCFF05" }}
              >
                <Mail className="h-3.5 w-3.5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] mb-0.5" style={{ color: "#2300fa" }}>Почта</p>
                <p className="text-xs font-medium text-black truncate">{email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-1.5 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#DCFF05" }}
              >
                <Send className="h-3.5 w-3.5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] mb-0.5" style={{ color: "#2300fa" }}>Телеграм</p>
                <p className="text-xs font-medium text-black truncate">{telegram || "—"}</p>
              </div>
            </div>
          </div>

        </CardContent>

        <div className="mx-4 h-px bg-gray-100" />

        <CardFooter className="px-4">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-full border-[#2300fa] text-[#2300fa] bg-transparent hover:bg-blue-50 text-sm h-9"
            >
              Подробнее
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full border-black bg-[#DCFF05] hover:bg-[#c9eb00] text-black text-sm h-9"
              onClick={() => setIsDialogOpen(true)}
            >
              Выбрать
            </Button>
          </div>
        </CardFooter>
      </Card>

      <SelectAssistantDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        assistantName={name}
        currentAssignments={currentAssignments}
      />
    </>
  )
}
