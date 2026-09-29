"use client"

import { Header } from "@/components/header"
import { AssistantNav } from "../student/components/student-nav"
import { TeacherNav } from "../teacher/components/teacher-nav"
import { useAuth } from "@/hooks/use-auth"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {user?.role === "teacher" ? <TeacherNav /> : <AssistantNav />}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
