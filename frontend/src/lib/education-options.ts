import { useEffect, useState } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export interface EducationOptions {
  faculties: string[]
  programs: { name: string; faculty: string }[]
  citizenships: string[]
}

export const OWN_VALUE_HINT = "Введите свое значение если не нашли подходящего"

// Collapse repeated / leading / trailing whitespace in a hand-typed name
export function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

const sameName = (a: string, b: string) =>
  normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()

// Unique faculty / program / citizenship names already in the database, for form suggestions
export function useEducationOptions(enabled = true): EducationOptions {
  const [options, setOptions] = useState<EducationOptions>({ faculties: [], programs: [], citizenships: [] })

  useEffect(() => {
    if (!enabled) return
    const token = localStorage.getItem("token")
    fetch(`${BACKEND_URL}/api/education-options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setOptions(data) })
      .catch(() => { /* suggestions are best-effort */ })
  }, [enabled])

  return options
}

// Suggestions matching what the user has typed so far
export function filterSuggestions(options: string[], query: string): string[] {
  const q = normalizeName(query).toLowerCase()
  const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  // Nothing to suggest when the value already is the only match
  return matches.length === 1 && sameName(matches[0], query) ? [] : matches
}

// Program names of the chosen faculty (all of them while no faculty is entered),
// without duplicates. A new faculty has no known programs, so nothing is suggested.
export function programNamesFor(options: EducationOptions, faculty: string): string[] {
  const programs = normalizeName(faculty)
    ? options.programs.filter((p) => sameName(p.faculty, faculty))
    : options.programs
  const seen = new Set<string>()
  const names: string[] = []
  for (const p of programs) {
    const key = p.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(p.name)
  }
  return names
}

// Replace a typed value with an existing spelling that differs only in case / spaces
export function canonicalName(options: string[], value: string): string {
  const normalized = normalizeName(value)
  return options.find((o) => sameName(o, normalized)) ?? normalized
}
