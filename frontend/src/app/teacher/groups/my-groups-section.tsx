"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GroupCard } from "./group-card"
import { GroupDetailsDialog } from "./group-details-dialog"
import { SelectAssistantDialog } from "./select-assistant-dialog"
import { CollapsibleSection } from "./collapsible-section"
import { TeacherOffer, TeacherBooking } from "../types"
import { toDisplayDiscipline } from "@/lib/disciplines"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type SelectedItem = { offer: TeacherOffer; booking: TeacherBooking } | null

export function MyGroupsSection() {
  const [offers, setOffers] = useState<TeacherOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null)
  const [selectAssistantOffer, setSelectAssistantOffer] = useState<TeacherOffer | null>(null)

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
      // fail silently
    }
  }

  // Offers with no bookings yet → "groups without assistant"
  const withoutAssistant = offers.filter((o) => o.bookings.length === 0)
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

      {isLoading && (
        <div className="text-sm text-gray-500 p-4">Загрузка...</div>
      )}

      {!isLoading && (
        <>
          {/* Section 1: Groups without an assistant */}
          <CollapsibleSection
            title="Группы без ассистента"
            count={withoutAssistant.length}
            defaultOpen={true}
          >
            {withoutAssistant.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">Группы без ассистента отсутствуют.</p>
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
                    managerFirstName={offer.manager_first_name}
                    managerLastName={offer.manager_last_name}
                    hideAssistantName={true}
                    onSelectAssistant={() => setSelectAssistantOffer(offer)}
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
                    discipline={offer.discipline}
                    faculty={offer.faculty}
                    program={offer.program}
                    modules={offer.modules}
                    groupsCount={offer.total_groups}
                    studentFirstName={booking.student_first_name}
                    studentLastName={booking.student_last_name}
                    studentEmail={booking.student_email}
                    studentTelegram={booking.student_telegram ?? undefined}
                    paymentType={booking.payment_type}
                    bookingStatus={booking.status}
                    onMoreDetails={() => setSelectedItem({ offer, booking })}
                    onAccept={() => handleAccept(booking.booking_id)}
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
