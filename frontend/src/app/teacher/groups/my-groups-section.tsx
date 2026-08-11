"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { GroupCard } from "./group-card"
import { GroupDetailsDialog } from "./group-details-dialog"
import { SelectAssistantDialog } from "./select-assistant-dialog"
import { CreateCourseDialog, EditBookingTarget } from "./create-course-dialog"
import { StudentDetailsDialog } from "../components/student-details-dialog"
import { CollapsibleSection } from "./collapsible-section"
import { TeacherOffer, TeacherBooking, CreateCourseData } from "../types"
import { toDisplayDiscipline } from "@/lib/disciplines"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type SelectedItem = { offer: TeacherOffer; booking: TeacherBooking } | null

export function MyGroupsSection() {
  const [offers, setOffers] = useState<TeacherOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null)
  const [selectAssistantOffer, setSelectAssistantOffer] = useState<TeacherOffer | null>(null)
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<TeacherOffer | null>(null)
  const [editingBooking, setEditingBooking] = useState<EditBookingTarget | null>(null)
  const [aboutStudentId, setAboutStudentId] = useState<string | null>(null)

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/teacher/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const raw: TeacherOffer[] = await response.json()
      const mapped = raw.map((o) => ({
        ...o,
        discipline: toDisplayDiscipline(o.discipline),
      }))
      setOffers(mapped)
    } catch {
      // fail silently
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const handleAccept = async (bookingId: number) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${BACKEND_URL}/api/teacher/bookings/${bookingId}/accept`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        await fetchGroups()
        toast.success("Ассистент успешно назначен!")
      }
    } catch {
      toast.error("Не удалось назначить ассистента.")
    }
  }

  const handleDelete = async (bookingId: number) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${BACKEND_URL}/api/teacher/bookings/${bookingId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.ok) {
        await fetchGroups()
        toast.success("Запись удалена.")
      }
    } catch {
      toast.error("Не удалось удалить запись.")
    }
  }

  const handleCreateCourse = async (data: CreateCourseData) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/teacher/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disciplineId: data.disciplineId,
          facultyName: data.faculty,
          programName: data.program,
          totalGroups: data.numberOfGroups,
          moduleIds: data.moduleIds,
          links: data.links,
        }),
      })
      if (!response.ok) throw new Error("Не удалось создать курс")
      await fetchGroups()
      toast.success("Курс создан.")
    } catch {
      toast.error("Не удалось создать курс.")
    }
  }

  const handleUpdateCourse = async (data: CreateCourseData) => {
    if (!editingOffer) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${BACKEND_URL}/api/teacher/offers/${editingOffer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disciplineId: data.disciplineId,
          facultyName: data.faculty,
          programName: data.program,
          totalGroups: data.numberOfGroups,
          moduleIds: data.moduleIds,
          links: data.links,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? "Не удалось сохранить изменения")
      }
      await fetchGroups()
      toast.success("Изменения сохранены.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить изменения.")
    } finally {
      setEditingOffer(null)
    }
  }

  const handleUpdateBookingCard = async (data: CreateCourseData) => {
    if (!editingBooking) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${BACKEND_URL}/api/teacher/bookings/${editingBooking.booking.booking_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            numGroups: data.numberOfGroups,
            paymentType: data.paymentType,
            disciplineId: data.disciplineId,
            facultyName: data.faculty,
            programName: data.program,
            moduleIds: data.moduleIds,
            links: data.links,
          }),
        }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? "Не удалось сохранить изменения")
      }
      await fetchGroups()
      toast.success("Изменения сохранены.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить изменения.")
    } finally {
      setEditingBooking(null)
    }
  }

  // Offers with open slots → assignable, regardless of how many assistants
  // are already assigned (fixes: available slots used to vanish from this
  // list as soon as the offer got its first assistant)
  const withoutAssistant = offers.filter((o) => o.available_groups > 0)
  // All bookings across offers → "my groups", pending first then active
  const myGroupItems = offers
    .flatMap((o) => o.bookings.map((b: TeacherBooking) => ({ offer: o, booking: b })))
    .sort((a, b) => {
      if (a.booking.status === b.booking.status) return 0
      return a.booking.status === "pending" ? -1 : 1
    })

  return (
    <div className="space-y-6">
      <GroupDetailsDialog
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        offer={selectedItem?.offer ?? null}
        booking={selectedItem?.booking ?? null}
      />

      <SelectAssistantDialog
        isOpen={selectAssistantOffer !== null}
        onClose={() => setSelectAssistantOffer(null)}
        onSelect={() => { fetchGroups(); setSelectAssistantOffer(null) }}
        offerId={selectAssistantOffer?.id ?? 0}
        offerDiscipline={selectAssistantOffer?.discipline ?? ""}
        offerFaculty={selectAssistantOffer?.faculty ?? ""}
        offerProgram={selectAssistantOffer?.program ?? ""}
        offerGroups={selectAssistantOffer?.total_groups ?? 0}
        offerAvailableGroups={selectAssistantOffer?.available_groups ?? 0}
      />

      <CreateCourseDialog
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
        onSubmit={handleCreateCourse}
      />

      <CreateCourseDialog
        isOpen={editingOffer !== null}
        onClose={() => setEditingOffer(null)}
        onSubmit={handleUpdateCourse}
        editOffer={editingOffer}
      />

      <CreateCourseDialog
        isOpen={editingBooking !== null}
        onClose={() => setEditingBooking(null)}
        onSubmit={handleUpdateBookingCard}
        editBooking={editingBooking}
      />

      <StudentDetailsDialog
        isOpen={aboutStudentId !== null}
        onClose={() => setAboutStudentId(null)}
        studentId={aboutStudentId}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setIsCreateCourseOpen(true)}
          className="flex-shrink-0 px-8 py-3 text-sm font-medium bg-[#DCFF05] hover:bg-[#c9eb00] text-black border border-black rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Курс
        </button>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500 p-4">Загрузка...</div>
      )}

      {!isLoading && (
        <>
          {/* Section 1: Groups with open slots */}
          <CollapsibleSection
            title="Группы со свободными местами"
            count={withoutAssistant.length}
            defaultOpen={true}
          >
            {withoutAssistant.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">Свободных мест нет.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {withoutAssistant.map((offer) => (
                  <GroupCard
                    key={offer.id}
                    offerId={String(offer.id)}
                    discipline={offer.discipline}
                    faculty={offer.faculty}
                    program={offer.program}
                    modules={offer.modules}
                    groupsCount={offer.total_groups}
                    availableGroups={offer.available_groups}
                    hideAssistantName={true}
                    onSelectAssistant={() => setSelectAssistantOffer(offer)}
                    onEdit={() => setEditingOffer(offer)}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Section 2: My groups (booked) */}
          <CollapsibleSection
            title="Мои группы"
            count={myGroupItems.length}
            defaultOpen={true}
          >
            {myGroupItems.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">Группы пока не назначены.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myGroupItems.map(({ offer, booking }) => (
                  <GroupCard
                    key={booking.booking_id}
                    offerId={String(offer.id)}
                    bookingId={booking.booking_id}
                    discipline={offer.discipline}
                    faculty={offer.faculty}
                    program={offer.program}
                    modules={offer.modules}
                    groupsCount={booking.num_groups}
                    studentFirstName={booking.student_first_name}
                    studentLastName={booking.student_last_name}
                    studentEmail={booking.student_email}
                    studentTelegram={booking.student_telegram ?? undefined}
                    paymentType={booking.payment_type}
                    bookingStatus={booking.status}
                    onMoreDetails={() => setSelectedItem({ offer, booking })}
                    onAboutAssistant={() => setAboutStudentId(String(booking.student_id))}
                    onEdit={() => setEditingBooking({
                      offer,
                      booking,
                      // capacity left for this assistant: request total minus the others
                      maxGroups: Math.min(
                        4,
                        offer.total_groups -
                          offer.bookings
                            .filter((b) => b.booking_id !== booking.booking_id)
                            .reduce((sum, b) => sum + (b.num_groups ?? 1), 0)
                      ),
                    })}
                    onAccept={() => handleAccept(booking.booking_id)}
                    onDelete={() => handleDelete(booking.booking_id)}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Section 3: Archive (empty for now) */}
          <CollapsibleSection
            title="Архив групп"
            count={0}
            defaultOpen={false}
          >
            <p className="text-sm text-gray-400 italic p-2">Архив групп пуст.</p>
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}
