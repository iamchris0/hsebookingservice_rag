"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { useAuth } from "@/hooks/use-auth"

const navTabs = ["Courses"] as const

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, isAuthenticated } = useAuth('manager');
  const [activeTab, setActiveTab] = useState<string>("Courses");

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 flex gap-8">
          <button
            onClick={() => setActiveTab("Courses")}
            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 border-primary text-primary ${
              activeTab === "Courses"
                ? "text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Курсы
            {activeTab === "Courses" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
