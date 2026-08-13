import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, authorize, getAuth } from "../middleware/auth.js";

const router = Router();
const staff = [Role.ADMIN, Role.HR_MANAGER, Role.HR_OFFICER];
const respond = (data: unknown, message = "Success") => ({ success: true, message, data });
const tokenLifetime = (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"];
const sign = (payload: object) => jwt.sign(payload, process.env.JWT_SECRET || "development-only-secret-change-me", { expiresIn: tokenLifetime });

router.post("/auth/register", async (request, response) => {
  const parsed = z.object({ firstName: z.string().trim().min(2).max(50), lastName: z.string().trim().min(2).max(50), email: z.string().trim().email(), password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/), accountType: z.enum(["EMPLOYEE", "EMPLOYER"]) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, message: "Please provide a valid name, email, and strong password", errors: parsed.error.issues });
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return response.status(409).json({ success: false, message: "An account already exists for this email" });
  const isEmployer = parsed.data.accountType === "EMPLOYER";
  const employee = await prisma.employee.create({ data: { employeeNumber: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`, firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email, jobTitle: isEmployer ? "HR Manager" : "Employee", hireDate: new Date() } });
  const user = await prisma.user.create({ data: { email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: isEmployer ? Role.HR_MANAGER : Role.EMPLOYEE, employeeId: employee.id } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "USER_REGISTERED", description: `Created an ${isEmployer ? "employer" : "employee"} account` } });
  return response.status(201).json(respond({ token: sign({ userId: user.id, role: user.role, employeeId: employee.id }), user: { id: user.id, email: user.email, role: user.role, employee } }, "Account created successfully"));
});

router.post("/auth/login", async (request, response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, message: "Invalid credentials" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, include: { employee: true } });
  if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return response.status(401).json({ success: false, message: "Invalid email or password" });
  await prisma.activityLog.create({ data: { userId: user.id, action: "LOGIN", description: "Signed in to HR Management" } });
  return response.json(respond({ token: sign({ userId: user.id, role: user.role, employeeId: user.employeeId }), user: { id: user.id, email: user.email, role: user.role, employee: user.employee } }, "Login successful"));
});

router.get("/auth/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: getAuth(request).userId }, include: { employee: true } });
  return response.json(respond(user));
});
router.get("/dashboard/stats", authenticate, async (request, response) => {
  const auth = getAuth(request);
  if (auth.role === Role.EMPLOYEE) {
    const employeeId = auth.employeeId ?? "";
    const [pending, approved, rejected] = await Promise.all([prisma.leaveRequest.count({ where: { employeeId, status: "PENDING" } }), prisma.leaveRequest.count({ where: { employeeId, status: "APPROVED" } }), prisma.leaveRequest.count({ where: { employeeId, status: "REJECTED" } })]);
    return response.json(respond({ employees: 1, active: 1, departments: 0, pending, approved, rejected }));
  }
  const [employees, active, departments, pending, approved, rejected] = await Promise.all([prisma.employee.count(), prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }), prisma.department.count(), prisma.leaveRequest.count({ where: { status: "PENDING" } }), prisma.leaveRequest.count({ where: { status: "APPROVED" } }), prisma.leaveRequest.count({ where: { status: "REJECTED" } })]);
  return response.json(respond({ employees, active, departments, pending, approved, rejected }));
});

router.get("/employees", authenticate, authorize(...staff), async (request, response) => {
  const search = String(request.query.search || "");
  const employees = await prisma.employee.findMany({ where: search ? { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { employeeNumber: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}, include: { department: true, manager: true }, orderBy: { createdAt: "desc" } });
  return response.json(respond(employees));
});
router.post("/employees", authenticate, authorize(...staff), async (request, response) => {
  const parsed = z.object({ employeeNumber: z.string().min(3), firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), jobTitle: z.string().min(1), hireDate: z.coerce.date(), departmentId: z.string().optional() }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, message: "Validation failed", errors: parsed.error.issues });
  return response.status(201).json(respond(await prisma.employee.create({ data: parsed.data }), "Employee created successfully"));
});
router.get("/departments", authenticate, async (_request, response) => response.json(respond(await prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }))));
router.post("/departments", authenticate, authorize(Role.ADMIN, Role.HR_MANAGER), async (request, response) => {
  const parsed = z.object({ name: z.string().min(2), description: z.string().optional() }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, message: "Validation failed" });
  return response.status(201).json(respond(await prisma.department.create({ data: parsed.data }), "Department created successfully"));
});

router.get("/leave-types", authenticate, async (_request, response) => response.json(respond(await prisma.leaveType.findMany({ orderBy: { name: "asc" } }))));
router.get("/leave", authenticate, async (request, response) => {
  const auth = getAuth(request);
  const where = auth.role === Role.EMPLOYEE ? { employeeId: auth.employeeId ?? "" } : {};
  return response.json(respond(await prisma.leaveRequest.findMany({ where, include: { employee: true, leaveType: true }, orderBy: { createdAt: "desc" } })));
});
router.post("/leave", authenticate, async (request, response) => {
  const auth = getAuth(request);
  if (!auth.employeeId) return response.status(403).json({ success: false, message: "Employee profile required" });
  const parsed = z.object({ leaveTypeId: z.string(), startDate: z.coerce.date(), endDate: z.coerce.date(), reason: z.string().min(3) }).refine((value) => value.endDate >= value.startDate, { message: "End date must be after start date" }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, message: "Validation failed", errors: parsed.error.issues });
  const leave = await prisma.leaveRequest.create({ data: { ...parsed.data, employeeId: auth.employeeId } });
  const reviewers = await prisma.user.findMany({ where: { role: { in: staff } }, select: { id: true } });
  await prisma.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.id, title: "New leave request", message: "An employee submitted a leave request.", type: "LEAVE" })) });
  await prisma.activityLog.create({ data: { userId: auth.userId, action: "LEAVE_SUBMITTED", description: "Submitted a leave request" } });
  return response.status(201).json(respond(leave, "Leave request submitted"));
});
router.put("/leave/:id/:decision", authenticate, authorize(...staff), async (request, response) => {
  const status = request.params.decision === "approve" ? "APPROVED" : request.params.decision === "reject" ? "REJECTED" : null;
  if (!status) return response.status(400).json({ success: false, message: "Invalid decision" });
  const auth = getAuth(request);
  const leave = await prisma.leaveRequest.update({ where: { id: String(request.params.id) }, data: { status, reviewedBy: auth.userId, reviewedAt: new Date(), reviewNotes: request.body.reviewNotes }, include: { employee: { include: { user: true } } } });
  if (leave.employee.user) await prisma.notification.create({ data: { userId: leave.employee.user.id, title: `Leave request ${status.toLowerCase()}`, message: `Your leave request was ${status.toLowerCase()}.`, type: "LEAVE" } });
  await prisma.activityLog.create({ data: { userId: auth.userId, action: `LEAVE_${status}`, description: `Reviewed leave request ${leave.id}` } });
  return response.json(respond(leave, `Leave request ${status.toLowerCase()}`));
});
router.get("/notifications", authenticate, async (request, response) => response.json(respond(await prisma.notification.findMany({ where: { userId: getAuth(request).userId }, orderBy: { createdAt: "desc" } }))));

export default router;
