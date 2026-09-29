"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AccountProfile, Discipline } from "./types"
import { PersonalInfoBlock } from "./components/personal-info-block"
import { AboutBlock } from "./components/about-block"
import { EducationBlock } from "./components/education-block"
import { PriorityBlock } from "./components/priority-block"
import { MotivationBlock } from "./components/motivation-block"
import { RecommendationBlock } from "./components/recommendation-block"
import { CollapsibleBlock } from "./components/collapsible-block"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export default function ProfilePage() {
  const { isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token")
    const response = await fetch(`${BACKEND_URL}/api/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error("Не удалось загрузить профиль")
    const data: AccountProfile = await response.json()
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("token")
        const data = await fetchProfile()
        if (data.role === "student") {
          const disciplinesResponse = await fetch(`${BACKEND_URL}/api/disciplines`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (disciplinesResponse.ok && !cancelled) {
            setDisciplines(await disciplinesResponse.json())
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка загрузки")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [authLoading, fetchProfile])

  const refreshProfile = useCallback(() => {
    fetchProfile().catch(() => { /* keep last known state on refresh failure */ })
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] animate-spin" style={{ borderColor: "#2300fa", borderTopColor: "transparent" }} />
        <span className="text-sm text-gray-400">Загрузка профиля...</span>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-red-500">{error ?? "Не удалось загрузить профиль"}</p>
      </div>
    )
  }

  const priority1 = profile.priorities?.find((p) => p.priority === 1)
  const priority2 = profile.priorities?.find((p) => p.priority === 2)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Личный кабинет</h1>
      </div>

      <PersonalInfoBlock profile={profile} onSaved={refreshProfile} />

      {profile.role === "student" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-black pt-2">Ответы опросной формы</h2>

          <CollapsibleBlock title="О себе" subtitle="Telegram, дата рождения, гражданство, телефон">
            <AboutBlock profile={profile} onSaved={refreshProfile} />
          </CollapsibleBlock>

          <CollapsibleBlock title="Образование" subtitle="Факультет, программа, курс, оценки">
            <EducationBlock profile={profile} onSaved={refreshProfile} />
          </CollapsibleBlock>

          <CollapsibleBlock title="Приоритетная дисциплина" subtitle={priority1?.discipline ?? "Не выбрана"}>
            <PriorityBlock
              priorityNumber={1}
              detail={priority1}
              disciplines={disciplines}
              onSaved={refreshProfile}
            />
          </CollapsibleBlock>

          <CollapsibleBlock title="Второй приоритет" subtitle={priority2?.discipline ?? "Не рассматриваю 2-й приоритет"}>
            <PriorityBlock
              priorityNumber={2}
              detail={priority2}
              disciplines={disciplines}
              excludeDisciplineId={priority1?.disciplineId}
              onSaved={refreshProfile}
            />
          </CollapsibleBlock>

          <CollapsibleBlock title="Мотивация" subtitle="Почему вы хотите быть ассистентом">
            <MotivationBlock profile={profile} onSaved={refreshProfile} />
          </CollapsibleBlock>

          <CollapsibleBlock title="Рекомендации" subtitle={profile.recommendationAvailable ? "Предоставлена" : "Не предоставлена"}>
            <RecommendationBlock profile={profile} onSaved={refreshProfile} />
          </CollapsibleBlock>
        </div>
      )}
    </div>
  )
}
