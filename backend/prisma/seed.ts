import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const department = await prisma.department.upsert({ where: { name: "People Operations" }, update: {}, create: { name: "People Operations", description: "Human resources and people experience" } });
  const employee = await prisma.employee.upsert({ where: { email: "ava.chen@hrflow.dev" }, update: {}, create: { employeeNumber: "EMP-001", firstName: "Ava", lastName: "Chen", email: "ava.chen@hrflow.dev", jobTitle: "HR Director", hireDate: new Date("2023-01-09"), departmentId: department.id } });
  await prisma.user.upsert({ where: { email: "admin@hrflow.dev" }, update: { passwordHash }, create: { email: "admin@hrflow.dev", passwordHash, role: Role.ADMIN, employeeId: employee.id } });
  for (const name of ["Annual Leave", "Sick Leave", "Family Responsibility Leave", "Study Leave", "Unpaid Leave"]) await prisma.leaveType.upsert({ where: { name }, update: {}, create: { name } });
  const technology = await prisma.department.upsert({ where: { name: "Technology" }, update: {}, create: { name: "Technology", description: "Engineering and product delivery" } });
  const finance = await prisma.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance", description: "Financial planning and controls" } });
  const people = [
    ["EMP-002", "Marcus", "Owens", "marcus.owens@hrflow.dev", "Engineering Manager", technology.id],
    ["EMP-003", "Lina", "Patel", "lina.patel@hrflow.dev", "Software Engineer", technology.id],
    ["EMP-004", "Noah", "Williams", "noah.williams@hrflow.dev", "Product Designer", technology.id],
    ["EMP-005", "Sofia", "Mendez", "sofia.mendez@hrflow.dev", "Financial Analyst", finance.id],
    ["EMP-006", "Dylan", "Brooks", "dylan.brooks@hrflow.dev", "Recruiter", department.id],
  ] as const;
  for (const [employeeNumber, firstName, lastName, email, jobTitle, departmentId] of people) await prisma.employee.upsert({ where: { email }, update: {}, create: { employeeNumber, firstName, lastName, email, jobTitle, departmentId, hireDate: new Date("2024-02-01") } });
  const annualLeave = await prisma.leaveType.findUniqueOrThrow({ where: { name: "Annual Leave" } });
  const lina = await prisma.employee.findUniqueOrThrow({ where: { email: "lina.patel@hrflow.dev" } });
  const noah = await prisma.employee.findUniqueOrThrow({ where: { email: "noah.williams@hrflow.dev" } });
  await prisma.leaveRequest.upsert({ where: { id: "seed-pending-leave" }, update: {}, create: { id: "seed-pending-leave", employeeId: lina.id, leaveTypeId: annualLeave.id, startDate: new Date("2026-09-14"), endDate: new Date("2026-09-18"), reason: "Annual family holiday" } });
  await prisma.leaveRequest.upsert({ where: { id: "seed-approved-leave" }, update: {}, create: { id: "seed-approved-leave", employeeId: noah.id, leaveTypeId: annualLeave.id, startDate: new Date("2026-07-07"), endDate: new Date("2026-07-11"), reason: "Annual leave", status: "APPROVED", reviewedBy: (await prisma.user.findUniqueOrThrow({ where: { email: "admin@hrflow.dev" } })).id, reviewedAt: new Date() } });
}
main().finally(() => prisma.$disconnect());