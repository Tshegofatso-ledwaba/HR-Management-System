"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import {
  authService,
  dashboardService,
  hrService,
  type AuthUser,
  type DashboardStats,
  type Department,
  type Employee,
  type LeaveRequest,
  type LeaveType,
} from "@/services/api";

type View = "Overview" | "Employees" | "Departments" | "Leave";
const zeroStats: DashboardStats = {
  employees: 0,
  active: 0,
  departments: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountType, setAccountType] = useState<"EMPLOYEE" | "EMPLOYER">("EMPLOYEE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("Overview");
  const [stats, setStats] = useState(zeroStats);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const isEmployer = user?.role !== "EMPLOYEE";

  useEffect(() => {
    if (localStorage.getItem("hrflow_token"))
      authService
        .me()
        .then(setUser)
        .catch(() => authService.logout());
  }, []);
  useEffect(() => {
    if (user)
      dashboardService
        .stats()
        .then(setStats)
        .catch(() => setMessage("Unable to load the dashboard."));
  }, [user]);
  useEffect(() => {
    if (user) router.replace(user.role === "EMPLOYEE" ? "/employee" : "/employer");
  }, [router, user]);
  useEffect(() => {
    if (!user || view === "Overview") return;
    setBusy(true);
    const load =
      view === "Employees"
        ? hrService.employees().then(setEmployees)
        : view === "Departments"
          ? hrService.departments().then(setDepartments)
          : Promise.all([hrService.leave().then(setLeaves), hrService.leaveTypes().then(setLeaveTypes)]).then(() => undefined);
    load
      .catch(() => setMessage("Unable to load this data."))
      .finally(() => setBusy(false));
  }, [user, view]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session =
        mode === "login"
          ? await authService.login(email, password)
          : await authService.register(firstName, lastName, email, password, accountType);
      localStorage.setItem("hrflow_token", session.token);
      setUser(session.user);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to continue.",
      );
    } finally {
      setBusy(false);
    }
  }
  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setPassword("");
    setMessage("");
  };
  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try { await hrService.submitLeave(leaveTypeId, startDate, endDate, reason); setReason(""); setStartDate(""); setEndDate(""); setMessage("Leave request submitted for employer review."); setLeaves(await hrService.leave()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit leave request."); } finally { setBusy(false); }
  }
  async function reviewLeave(id: string, decision: "approve" | "reject") {
    setBusy(true); setMessage("");
    try { await hrService.reviewLeave(id, decision); setLeaves(await hrService.leave()); setStats(await dashboardService.stats()); setMessage(`Leave request ${decision}d.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to review leave request."); } finally { setBusy(false); }
  }

  if (!user)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f6fc] p-5">
        <section className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/50 md:grid-cols-2">
          <aside className="hidden bg-[#153780] p-10 text-white md:block">
            <p className="text-2xl font-bold">
              HR Management
            </p>
            <h1 className="mt-20 text-4xl font-bold leading-tight">
              People operations, brought into focus.
            </h1>
            <p className="mt-5 text-sm leading-6 text-blue-100">
              Manage people records, departments, and leave from one secure
              workspace.
            </p>
          </aside>
          <form onSubmit={submit} className="p-8 sm:p-10">
            <p className="text-2xl font-bold text-blue-700">
              HR Management
            </p>
            <h2 className="mt-8 text-2xl font-bold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in with your own credentials."
                : "Register as an employee in HR Management."}
            </p>
            {message && (
              <p className="mt-5 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
                {message}
              </p>
            )}
            {mode === "register" && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  First name
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  Last name
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5"
                  />
                </label>
              </div>
            )}
            {mode === "register" && (
              <label className="mt-4 block text-sm font-medium">
                Register as
                <select
                  value={accountType}
                  onChange={(event) =>
                    setAccountType(event.target.value as "EMPLOYEE" | "EMPLOYER")
                  }
                  className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="EMPLOYER">Employer / HR manager</option>
                </select>
              </label>
            )}
            <label className="mt-5 block text-sm font-medium">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Password
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  className="w-full rounded-md border border-slate-300 p-2.5 pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {mode === "register" && (
              <p className="mt-2 text-xs text-slate-500">
                8+ characters, including uppercase, lowercase, and a number.
              </p>
            )}
            <button
              disabled={busy}
              className="mt-6 w-full rounded-md bg-blue-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
            <p className="mt-5 text-center text-sm text-slate-600">
              {mode === "login" ? "New to HR Management?" : "Already registered?"}{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "login" ? "register" : "login")
                }
                className="font-semibold text-blue-700"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="mt-6 text-xs text-slate-500 underline"
            >
              {showDemo
                ? "Hide development credentials"
                : "Show development credentials"}
            </button>
            {showDemo && (
              <p className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                Admin demo: admin@hrflow.dev / Admin123!
              </p>
            )}
          </form>
        </section>
      </main>
    );

  const nav = [
    ["Overview", LayoutDashboard],
    ...(isEmployer ? [["Employees", Users], ["Departments", Building2]] as const : []),
    ["Leave", CalendarDays],
  ] as const;
  const cards = [
    ["Total employees", stats.employees],
    ["Active employees", stats.active],
    ["Departments", stats.departments],
    ["Pending leave", stats.pending],
  ] as const;
  const data =
    view === "Employees" ? (
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Employee</th>
            <th className="p-4">Department</th>
            <th className="p-4">Job title</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="p-4 font-medium">
                {item.firstName} {item.lastName}
                <p className="text-xs font-normal text-slate-500">
                  {item.email}
                </p>
              </td>
              <td className="p-4">{item.department?.name ?? "Unassigned"}</td>
              <td className="p-4">{item.jobTitle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : view === "Departments" ? (
      <div className="grid gap-4 p-1 md:grid-cols-2">
        {departments.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="font-bold">{item.name}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {item.description || "No description"}
            </p>
            <p className="mt-4 text-sm font-semibold text-blue-700">
              {item._count.employees} employees
            </p>
          </article>
        ))}
      </div>
    ) : isEmployer ? (
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Employee</th>
            <th className="p-4">Type</th>
            <th className="p-4">Status</th>
            <th className="p-4">Review</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="p-4 font-medium">
                {item.employee.firstName} {item.employee.lastName}
              </td>
              <td className="p-4">{item.leaveType.name}</td>
              <td className="p-4">{item.status}</td>
              <td className="p-4">{item.status === "PENDING" ? <div className="flex gap-2"><button onClick={() => reviewLeave(item.id, "approve")} className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Approve</button><button onClick={() => reviewLeave(item.id, "reject")} className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white">Reject</button></div> : <span className="text-xs text-slate-400">Reviewed</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="grid gap-6 p-5 lg:grid-cols-[.9fr_1.1fr]"><form onSubmit={submitLeave} className="rounded-lg border border-slate-200 p-5"><h3 className="font-bold">Request leave</h3><label className="mt-4 block text-sm font-medium">Leave type<select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5"><option value="">Select a leave type</option>{leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Start date<input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" required className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5" /></label><label className="text-sm font-medium">End date<input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" required className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5" /></label></div><label className="mt-4 block text-sm font-medium">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} className="mt-1.5 w-full rounded-md border border-slate-300 p-2.5" /></label><button disabled={busy} className="mt-5 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Submit request</button></form><div><h3 className="mb-3 font-bold">Your leave history</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Type</th><th className="p-3">Dates</th><th className="p-3">Status</th></tr></thead><tbody>{leaves.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-3">{item.leaveType.name}</td><td className="p-3">{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</td><td className="p-3">{item.status}</td></tr>)}</tbody></table></div></div></div>
    );
  return (
    <div className="min-h-screen bg-[#f3f6fc] text-slate-800">
      <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <h1 className="mb-10 text-2xl font-bold text-blue-700">
          HR Management
        </h1>
        {nav.map(([label, Icon]) => (
          <button
            key={label}
            onClick={() => setView(label)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${view === label ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </aside>
      <main className="lg:pl-64">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Workspace
            </p>
            <h2 className="font-bold">
              Good morning, {user.employee?.firstName ?? "there"}
            </h2>
          </div>
          <button
            onClick={() => {
              authService.logout();
              setUser(null);
            }}
            aria-label="Sign out"
            className="rounded-md border border-slate-200 p-2 text-slate-500"
          >
            <LogOut size={18} />
          </button>
        </header>
        <section className="mx-auto max-w-7xl p-6 md:p-9">
          <h2 className="text-2xl font-bold">{view}</h2>
          {message && (
            <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {message}
            </p>
          )}
          {view === "Overview" ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-lg border border-slate-200 bg-white p-5"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-bold">{value}</p>
                  <p className="mt-4 text-xs text-slate-400">
                    Live HR Management data
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <section className="mt-7 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              {busy ? (
                <p className="p-6 text-sm text-slate-500">Loading data...</p>
              ) : (
                data
              )}
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
