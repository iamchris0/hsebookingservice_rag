"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from '@/lib/utils'

export function AssistantNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          <Link
            href="/student/my-groups"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/student/my-groups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Мои группы
          </Link>
          <Link
            href="/student/search"
            className={cn(
              "px-6 py-4 text-sm font-medium transition-colors border-b-2",
              pathname === "/student/search"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Поиск группы
          </Link>
        </div>
      </div>
    </nav>
  )
}
