// Общие типы фронтенда.
// Сюда можно складывать интерфейсы/типы, которые
// используются в разных страницах и компонентах.

export type UserRole = "student" | "teacher";

export interface User {
  email: string;
  role: UserRole;
}

