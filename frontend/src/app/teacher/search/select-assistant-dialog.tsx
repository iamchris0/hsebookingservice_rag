"use client"

import React from "react"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Assignment {
  discipline: string
  program: string
  groups: number
  modules?: number[]
}

interface SelectAssistantDialogProps {
  isOpen: boolean
  onClose: () => void
  assistantName: string
  currentAssignments: Assignment[]
}

const MAX_ASSIGNMENTS = 4

const disciplines = ["Программирование на Python", "Анализ данных", "Машинное обучение", "Цифровая грамотность"]

export function SelectAssistantDialog({
  isOpen,
  onClose,
  assistantName,
  currentAssignments,
}: SelectAssistantDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Form state
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null)
  const [programName, setProgramName] = useState("")
  const [numberOfGroups, setNumberOfGroups] = useState<number>(1)
  const [selectedModules, setSelectedModules] = useState<number[]>([])

  const hasReachedMax = currentAssignments.length >= MAX_ASSIGNMENTS
  const hasNoAssignments = currentAssignments.length === 0

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        // Reset form
        setSelectedDiscipline(null)
        setProgramName("")
        setNumberOfGroups(1)
        setSelectedModules([])
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleModule = (module: number) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    )
  }

  const handleSelect = () => {
    // Handle selection logic here
    onClose()
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-xl mx-4 p-2 overflow-hidden shadow-2xl transition-all duration-300 ${
          isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2300fa]">
              Select Assignment for {assistantName}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">
          {/* Current Assignments Section */}
          <div className="mb-3">
            <h3 className="font-bold text-black text-sm mb-2">Current Assignments</h3>
            
            {hasNoAssignments ? (
              <>
                <p className="text-gray-400 italic text-sm">No assignments yet</p>
              </>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-100 grid grid-cols-[2fr_2fr_1fr_1fr] px-3 py-2">
                  <span className="text-xs font-medium text-[#2300fa]">Дисциплина</span>
                  <span className="text-xs font-medium text-[#2300fa]">Образовательная программа</span>
                  <span className="text-xs font-medium text-center text-[#2300fa]">Группы</span>
                  <span className="text-xs font-medium text-center text-[#2300fa]">Учебные модули</span>
                </div>
                
                {/* Table Body */}
                <div className={currentAssignments.length > 4 ? "max-h-32 overflow-y-auto" : ""}>
                  {currentAssignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[2fr_2fr_1fr_1fr] px-3 py-1.5 border-t border-gray-100"
                    >
                      <span className="text-xs text-black">{assignment.discipline}</span>
                      <span className="text-xs text-black">{assignment.program}</span>
                      <span className="text-xs text-center text-black">{assignment.groups}</span>
                      <span className="text-xs text-center text-black">{assignment.modules?.join(", ") || "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Max Assignments Warning */}
          {hasReachedMax && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
              <p className="text-red-500 font-medium text-sm">
                Этот ассистент достиг максимального количества {MAX_ASSIGNMENTS} бронирований и не может быть
                выбран для дополнительных курсов.
              </p>
            </div>
          )}

          {/* Selection Form - Only show if not at max */}
          {!hasReachedMax && (
            <>
              <div className="h-[2px] bg-[#2300fa] mb-3" />

              {/* Discipline Selection */}
              <div className="mb-3">
                <h3 className="font-bold text-[#2300fa] text-sm mb-2">
                  Какую дисциплину вы хотите выбрать?
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {disciplines.map((discipline) => (
                    <label
                      key={discipline}
                      className="flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                      style={{
                        borderColor: selectedDiscipline === discipline ? '#2300fa' : '#e5e5e5',
                        backgroundColor: selectedDiscipline === discipline ? '#f0f0ff' : '#ffffff'
                      }}
                    >
                      <input
                        type="radio"
                        name="discipline"
                        value={discipline}
                        checked={selectedDiscipline === discipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                        className="w-4 h-4 accent-[#2300fa]"
                      />
                      <span className="text-sm" style={{ color: '#000000' }}>{discipline}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Program Input */}
              <div className="mb-3">
                <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Выберите образовательную программу</label>
                <Input
                  placeholder="Введите название ОП"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="bg-gray-100 border-none rounded-lg h-9 text-sm"
                />
              </div>

              {/* Number of Groups */}
              <div className="mb-3">
                <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Количество групп</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNumberOfGroups(1)}
                    className={`flex-1 py-2 px-4 text-center text-sm font-medium rounded-md border transition-colors ${
                      numberOfGroups === 1
                        ? "bg-[#2300fa] text-white border-[#2300fa]"
                        : "bg-white text-black border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    1
                  </button>
                  <button
                    onClick={() => setNumberOfGroups(2)}
                    className={`flex-1 py-2 px-4 text-center text-sm font-medium rounded-md border transition-colors ${
                      numberOfGroups === 2
                        ? "bg-[#2300fa] text-white border-[#2300fa]"
                        : "bg-white text-black border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    2
                  </button>
                </div>
              </div>

              {/* Module Selection */}
              <div className="mb-4">
                <label className="block font-bold text-[#2300fa] text-sm mb-1.5">Выберите учебные модули</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((module) => (
                    <button
                      key={module}
                      onClick={() => toggleModule(module)}
                      className={`flex-1 py-2 px-4 text-center text-sm font-medium rounded-md border transition-colors ${
                        selectedModules.includes(module)
                          ? "bg-[#2300fa] text-white border-[#2300fa]"
                          : "bg-white text-black border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {module}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Button */}
              <Button
                onClick={handleSelect}
                disabled={!selectedDiscipline || !programName || selectedModules.length === 0}
                className="w-full h-10 rounded-full bg-[#DCFF05] hover:bg-[#c9eb00] text-black font-medium border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Выбрать
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
