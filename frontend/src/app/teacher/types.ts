// Типы для роли преподавателя (Teacher)

export interface Group {
  id: string;
  lastName?: string;
  firstName?: string;
  email: string;
  program: string;
  discipline: string;
  studyPeriod: string;
  paymentFormat?: string;
}

export interface Assistant {
  id: string;
  name: string;
  skills: Array<{ number: number; name: string }>;
  faculty: string;
  trainingProgram: string;
  email: string;
  isFavorite: boolean;
  currentAssignments: Array<{
    discipline: string;
    program: string;
    groups: number;
    modules: number[];
  }>;
}

export interface DisciplineStat {
  id: string;
  name: string;
  count: number;
  icon: any;
  color: string;
}
