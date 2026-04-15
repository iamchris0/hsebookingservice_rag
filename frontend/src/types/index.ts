// Общие типы фронтенда.
// Сюда можно складывать интерфейсы/типы, которые
// используются в разных страницах и компонентах.

export type UserRole = "student" | "teacher" | "manager";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

