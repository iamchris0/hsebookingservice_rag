"use client"

import { AssistantCard } from "./assistant-card"
import { GroupFilters } from "../components/group-filters"

const mockAssistants = [
  {
    id: "1",
    name: "Johnson Emily",
    skills: [
      { number: 1, name: "Python" },
      { number: 2, name: "-" },
    ],
    faculty: "Faculty of Computer Science",
    trainingProgram: "Advanced Programming and AI",
    email: "emily.johnson@university.edu",
    isFavorite: false,
    currentAssignments: [
      { discipline: "Python", program: "CS101", groups: 2, modules: [1, 2] },
      { discipline: "Data Analysis", program: "STAT202", groups: 1, modules: [3, 4] },
    ],
  },
  {
    id: "2",
    name: "Chen Michael",
    skills: [
      { number: 1, name: "Machine Learning" },
      { number: 2, name: "-" },
    ],
    faculty: "Faculty of Data Science",
    trainingProgram: "AI and Machine Learning",
    email: "m.chen@university.edu",
    isFavorite: true,
    currentAssignments: [
      { discipline: "Machine Learning", program: "AI303", groups: 1, modules: [1] },
      { discipline: "Python", program: "CS102", groups: 2, modules: [2, 3] },
      { discipline: "Mathematics", program: "MATH201", groups: 1, modules: [3, 4] },
      { discipline: "Data Analysis", program: "STAT301", groups: 2, modules: [1, 2] },
    ],
  },
  {
    id: "3",
    name: "Martinez Sarah",
    skills: [
      { number: 1, name: "Web Development" },
      { number: 2, name: "React" },
    ],
    faculty: "Faculty of Engineering",
    trainingProgram: "Software Engineering",
    email: "sarah.m@university.edu",
    isFavorite: false,
    currentAssignments: [],
  },
  {
    id: "4",
    name: "Williams David",
    skills: [
      { number: 1, name: "Statistics" },
      { number: 2, name: "R Programming" },
    ],
    faculty: "Faculty of Mathematics",
    trainingProgram: "Applied Statistics",
    email: "d.williams@university.edu",
    isFavorite: false,
    currentAssignments: [
      { discipline: "Mathematics", program: "MATH101", groups: 1, modules: [1, 2, 3] },
    ],
  },
  {
    id: "5",
    name: "Brown Jessica",
    skills: [
      { number: 1, name: "Database Design" },
      { number: 2, name: "SQL" },
    ],
    faculty: "Faculty of Information Systems",
    trainingProgram: "Database Management",
    email: "j.brown@university.edu",
    isFavorite: true,
    currentAssignments: [
      { discipline: "Python", program: "CS201", groups: 2, modules: [1, 2] },
      { discipline: "Data Analysis", program: "STAT101", groups: 1, modules: [2, 3] },
      { discipline: "Machine Learning", program: "AI201", groups: 2, modules: [3, 4] },
    ],
  },
  {
    id: "6",
    name: "Taylor Robert",
    skills: [
      { number: 1, name: "Cybersecurity" },
      { number: 2, name: "Network Security" },
    ],
    faculty: "Faculty of Computer Science",
    trainingProgram: "Information Security",
    email: "r.taylor@university.edu",
    isFavorite: false,
    currentAssignments: [],
  },
  {
    id: "7",
    name: "Anderson Lisa",
    skills: [
      { number: 1, name: "UI/UX Design" },
      { number: 2, name: "Figma" },
    ],
    faculty: "Faculty of Design",
    trainingProgram: "Digital Design",
    email: "l.anderson@university.edu",
    isFavorite: false,
    currentAssignments: [],
  },
  {
    id: "8",
    name: "Thomas James",
    skills: [
      { number: 1, name: "Cloud Computing" },
      { number: 2, name: "AWS" },
    ],
    faculty: "Faculty of Engineering",
    trainingProgram: "Cloud Architecture",
    email: "j.thomas@university.edu",
    isFavorite: true,
    currentAssignments: [
      { discipline: "Python", program: "CS301", groups: 1, modules: [1, 2] },
      { discipline: "Machine Learning", program: "AI401", groups: 2, modules: [2, 3, 4] },
    ],
  },
]

export function AssistantSearchSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Поиск асситента</h1>

      <GroupFilters />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockAssistants.map((assistant) => (
          <AssistantCard key={assistant.id} {...assistant} />
        ))}
      </div>
    </div>
  )
}
