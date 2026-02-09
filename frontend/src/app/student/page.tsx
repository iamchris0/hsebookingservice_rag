"use client"

import { Header } from "@/components/header"
import { AssistantNav } from "@/assistant/components/assistant-nav"
import { MyCoursesSection } from "@/assistant/components/my-courses-section"
import { useAuth } from "@/hooks/use-auth"

export default function StudentPage() {
  const { isLoading } = useAuth('student');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AssistantNav />
      <main className="container mx-auto px-4 py-8">
        <MyCoursesSection />
      </main>
    </div>
  )
}
