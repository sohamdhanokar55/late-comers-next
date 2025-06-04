"use server"

import { revalidatePath } from "next/cache"

const students = [
  { id: "1", rollNumber: "001", name: "John Doe", lateCount: 0, isPaid: true },
  { id: "2", rollNumber: "002", name: "MayJary", lateCount: 2, isPaid: true },
]

export async function markAttendance(rollNumber: string) {
  const student = students.find((s) => s.rollNumber === rollNumber)
  if (student) {
    student.lateCount += 1
    if (student.lateCount > 3) {
      student.isPaid = false
    }
    revalidatePath("/late-comers")
    return { isLate: student.lateCount > 3 }
  }
  return { isLate: false }
}

export async function getLateComers() {
  return students.filter((s) => s.lateCount > 3)
}

export async function updatePaymentStatus(id: string) {
  const student = students.find((s) => s.id === id)
  if (student) {
    student.isPaid = true
    revalidatePath("/late-comers")
    return student
  }
  throw new Error("Student not found")
}

