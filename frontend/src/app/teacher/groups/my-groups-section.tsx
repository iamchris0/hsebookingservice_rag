"use client"

import { useState, useEffect } from "react"
import { GroupCard } from "./group-card"
import { GroupDetailsDialog } from "./group-details-dialog"
import { CollapsibleSection } from "./collapsible-section"
import { TeacherOffer, TeacherBooking } from "../types"
import { toDisplayDiscipline } from "@/lib/disciplines"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type SelectedItem = { offer: TeacherOffer; booking: TeacherBooking } | null

export function MyGroupsSection() {
  const [offers, setOffers] = useState<TeacherOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null)

  useEffect(() => {
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
    fetchGroups()
  }, [])

  // Offers with no bookings yet → "groups without assistant"
  const withoutAssistant = offers.filter((o) => o.bookings.length === 0)
  // All bookings across offers → "my groups"
  const myGroupItems = offers.flatMap((o) =>
    o.bookings.map((b: TeacherBooking) => ({ offer: o, booking: b }))
  )

  return (
    <div className="space-y-6">
      <GroupDetailsDialog
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        offer={selectedItem?.offer ?? null}
        booking={selectedItem?.booking ?? null}
      />

      {isLoading && (
        <div className="text-sm text-gray-500 p-4">Загрузка...</div>
      )}

      {!isLoading && (
        <>
          {/* Section 1: Groups without an assistant */}
          <CollapsibleSection
            title="Groups without an assistant"
            count={withoutAssistant.length}
            defaultOpen={true}
          >
            {withoutAssistant.length === 0 ? (
              <p className="text-sm text-gray-400 italic p-2">No groups without an assistant.</p>
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
              <p className="text-sm text-gray-400 italic p-2">No groups assigned yet.</p>
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
                    paymentType={booking.payment_type}
                    onMoreDetails={() => setSelectedItem({ offer, booking })}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Section 3: Archive (empty for now) */}
          <CollapsibleSection
            title="Archive groups"
            count={0}
            defaultOpen={false}
          >
            <p className="text-sm text-gray-400 italic p-2">No archived groups.</p>
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}
