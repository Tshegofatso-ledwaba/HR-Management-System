export type DashboardStats = { employees: number; active: number; departments: number; pending: number; approved: number; rejected: number };
type ApiResponse<T> = { success: boolean; message: string; data: T };

const normalizeApiBaseUrl = (value?: string) => {
  const raw = (value || "http://localhost:4000/api").trim().replace(/\/+$/, "");
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
};

const apiUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("hrflow_token");
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  } catch {
    throw new Error("Unable to reach the HR Management API. Check the deployed backend URL and CORS settings.");
  }
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message);
  return payload.data;
}
export const dashboardService = { stats: () => request<DashboardStats>("/dashboard/stats") };
export type Employee = { id: string; employeeNumber: string; firstName: string; lastName: string; email: string; jobTitle: string; employmentStatus: string; department?: { name: string } | null };
export type Department = { id: string; name: string; description?: string | null; _count: { employees: number } };
export type LeaveRequest = { id: string; status: string; startDate: string; endDate: string; reason: string; employee: { firstName: string; lastName: string }; leaveType: { name: string } };
export type LeaveType = { id: string; name: string; annualAllowance: number };
export const hrService = {
  employees: () => request<Employee[]>("/employees"),
  departments: () => request<Department[]>("/departments"),
  leave: () => request<LeaveRequest[]>("/leave"),
  leaveTypes: () => request<LeaveType[]>("/leave-types"),
  submitLeave: (leaveTypeId: string, startDate: string, endDate: string, reason: string) => request<LeaveRequest>("/leave", { method: "POST", body: JSON.stringify({ leaveTypeId, startDate, endDate, reason }) }),
  reviewLeave: (id: string, decision: "approve" | "reject") => request<LeaveRequest>(`/leave/${id}/${decision}`, { method: "PUT", body: JSON.stringify({}) }),
};
export type AuthUser = { id: string; email: string; role: string; employee?: { firstName: string; lastName: string } | null };
export const authService = {
  login: (email: string, password: string) => request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (firstName: string, lastName: string, email: string, password: string, accountType: "EMPLOYEE" | "EMPLOYER") => request<{ token: string; user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify({ firstName, lastName, email, password, accountType }) }),
  me: () => request<AuthUser>("/auth/me"),
  logout: () => localStorage.removeItem("hrflow_token"),
};