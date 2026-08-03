"use client"

import { useState, useEffect } from "react"
import { X, BookOpen, GraduationCap, UsersRound, Link as LinkIcon, Tag, UserCircle2, Mail } from "lucide-react"
import { TeacherOffer, TeacherBooking } from "../types"

interface GroupDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  offer: TeacherOffer | null
  booking?: TeacherBooking | null
}

export function GroupDetailsDialog({ isOpen, onClose, offer, booking }: GroupDetailsDialogProps) {
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

  if (!isVisible || !offer) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

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
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg font-bold text-[#2300fa] flex-shrink-0">Group Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
            >
              <X className="w-5 h-5 text-[#2300fa]" />
            </button>
          </div>
          <div className="h-[2px] bg-[#2300fa] mt-2" />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto space-y-3">

          {/* Row 1: Assistant info (only for booked groups) */}
          {booking && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <UserCircle2 className="w-3.5 h-3.5 text-[#2300fa]" />
                  <span className="text-xs font-bold text-[#2300fa]">Assistant</span>
                </div>
                <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">
                  {booking.student_last_name} {booking.student_first_name}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5 text-[#2300fa]" />
                  <span className="text-xs font-bold text-[#2300fa]">Email</span>
                </div>
                <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2 truncate">{booking.student_email}</p>
              </div>
            </div>
          )}

          {/* Row 2: Discipline (full width) */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5 text-[#2300fa]" />
              <span className="text-xs font-bold text-[#2300fa]">Дисциплина</span>
            </div>
            <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{offer.discipline}</p>
          </div>

          {/* Row 3: Faculty + Program */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Факультет</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{offer.faculty || "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Образовательная программа</span>
              </div>
              <p className="text-sm text-black bg-gray-100 rounded-lg px-3 py-2">{offer.program}</p>
            </div>
          </div>

          {/* Row 4: Groups (20%) + Modules (80%) */}
          <div className="flex gap-3 items-end">
            <div style={{ flex: "0 0 20%" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <UsersRound className="w-3.5 h-3.5 text-[#2300fa]" />
                <span className="text-xs font-bold text-[#2300fa]">Группы</span>
              </div>
              <div className="h-9 flex items-center justify-center text-sm font-semibold bg-gray-100 rounded-lg">
                {offer.total_groups}
              </div>
            </div>
            <div style={{ flex: "0 0 calc(80% - 0.75rem)" }}>
              <p className="text-xs font-bold text-[#2300fa] mb-1">Учебные модули</p>
              <div className="flex">
                {[1, 2, 3, 4].map((moduleNum, index) => (
                  <div
                    key={moduleNum}
                    className={`flex-1 h-9 flex items-center justify-center text-sm font-semibold ${
                      offer.modules.includes(moduleNum) ? "bg-black shadow-md" : "bg-gray-200 text-gray-400"
                    } ${index === 0 ? "rounded-l-full" : ""} ${index === 3 ? "rounded-r-full" : ""}`}
                    style={offer.modules.includes(moduleNum) ? { color: "#DCFF05" } : {}}
                  >
                    {moduleNum}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Links */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#2300fa]" />
              <span className="text-xs font-bold text-[#2300fa]">Ссылки</span>
            </div>
            {!offer.links || offer.links.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Ссылки не добавлены</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 grid grid-cols-2 px-3 py-1.5">
                  <span className="text-xs font-medium text-[#2300fa]">Название ссылки</span>
                  <span className="text-xs font-medium text-[#2300fa]">Ссылка</span>
                </div>
                {offer.links.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 px-3 py-2 border-t border-gray-100 items-center"
                  >
                    <span className="text-sm text-black truncate">{link.name}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#2300fa] underline truncate hover:text-[#1a00c0] transition-colors"
                    >
                      {link.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
