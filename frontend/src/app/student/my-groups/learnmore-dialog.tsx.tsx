"use client"

import React, { useState, useEffect } from "react"
import { X, Mail, BookOpen, GraduationCap, UsersRound, Tag, ExternalLink } from "lucide-react"
import { MyGroupCardProps } from "../types"

interface LearnMoreDialogProps {
  isOpen: boolean
  onClose: () => void
  group: MyGroupCardProps
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#DCFF05" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: "#2300fa" }}>{label}</p>
        <p className="text-xs font-medium text-black leading-tight">{value || "—"}</p>
      </div>
    </div>
  )
}

export function LearnMoreDialog({ isOpen, onClose, group }: LearnMoreDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const t = setTimeout(() => setIsAnimating(true), 50)
      return () => clearTimeout(t)
    } else {
      setIsAnimating(false)
      const timeout = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isVisible) return null

  const { teacherName, discipline, email, faculty, program, numberOfGroups, modules, links } = group

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? "bg-black/50" : "bg-black/0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl transition-all duration-300 ${
          isAnimating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-[#2300fa] leading-tight">{teacherName}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <InfoRow icon={<Tag className="h-3.5 w-3.5 text-black" />} label="Дисциплина" value={discipline} />
          <InfoRow icon={<Mail className="h-3.5 w-3.5 text-black" />} label="Контакты преподавателя" value={email} />
          <InfoRow icon={<GraduationCap className="h-3.5 w-3.5 text-black" />} label="Факультет" value={faculty} />
          <InfoRow icon={<BookOpen className="h-3.5 w-3.5 text-black" />} label="Программа" value={program} />

          {/* Groups + Modules */}
          <div className="flex gap-2 items-end">
            <div style={{ flex: "0 0 20%" }}>
              <div className="flex items-center gap-1 mb-1">
                <UsersRound className="h-3 w-3" style={{ color: "#2300fa" }} />
                <p className="text-[10px]" style={{ color: "#2300fa" }}>Группы</p>
              </div>
              <div className="h-8 flex items-center justify-center text-sm font-bold bg-gray-100 rounded-lg">
                {numberOfGroups}
              </div>
            </div>
            <div style={{ flex: "0 0 calc(80% - 0.5rem)" }}>
              <p className="text-[10px] mb-1" style={{ color: "#2300fa" }}>Учебные модули</p>
              <div className="flex">
                {[1, 2, 3, 4].map((m, i) => (
                  <div
                    key={m}
                    className={`flex-1 h-8 flex items-center justify-center text-sm font-semibold ${
                      modules.includes(m) ? "bg-black" : "bg-gray-200 text-gray-400"
                    } ${i === 0 ? "rounded-l-full" : ""} ${i === 3 ? "rounded-r-full" : ""}`}
                    style={modules.includes(m) ? { color: "#DCFF05" } : {}}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Links */}
          {links && links.length > 0 && (
            <div>
              <div className="h-px bg-gray-100 mb-3" />
              <p className="text-xs font-bold mb-2" style={{ color: "#2300fa" }}>Ссылки</p>
              <div className="space-y-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-[#2300fa] transition-colors" />
                    <span className="text-xs font-medium text-black truncate">{link.name || link.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
