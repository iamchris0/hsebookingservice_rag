// Maps DB English keys → Russian display names
export const DISCIPLINE_DB_TO_DISPLAY: Record<string, string> = {
  machine_learning:   "Машинное обучение",
  data_analysis:      "Анализ данных",
  python_programming: "Программирование",
  digital_literacy:   "Цифровая грамотность",
}

// Maps Russian display names → DB English keys
export const DISCIPLINE_DISPLAY_TO_DB: Record<string, string> = {
  "Машинное обучение": "machine_learning",
  "Анализ данных":     "data_analysis",
  "Программирование":  "python_programming",
  "Цифровая грамотность":        "digital_literacy",
}

export function toDisplayDiscipline(dbKey: string): string {
  return DISCIPLINE_DB_TO_DISPLAY[dbKey] ?? dbKey
}

export function toDbDiscipline(displayName: string): string {
  return DISCIPLINE_DISPLAY_TO_DB[displayName] ?? displayName
}
