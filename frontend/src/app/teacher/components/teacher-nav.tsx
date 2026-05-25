"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from '@/lib/utils'

export function TeacherNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          <Link
            href="/teacher/groups"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/teacher/groups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Мои группы
          </Link>
          <Link
            href="/teacher/search"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/teacher/search"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Поиск асситента
          </Link>
          <Link
            href="/teacher/ai-assistant"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/teacher/ai-assistant"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            ИИ помощник
          </Link>
        </div>
      </div>
    </nav>
  )
}
