import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export type AuthContext = {
  userId: string;
  role: Role;
  employeeId?: string | null;
};

type AuthenticatedRequest = Request & { auth?: AuthContext };

const secret = () => process.env.JWT_SECRET || "development-only-secret-change-me";
export const getAuth = (request: Request): AuthContext => (request as AuthenticatedRequest).auth as AuthContext;
export const authenticate = (request: Request, response: Response, next: NextFunction) => {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ success: false, message: "Authentication required" });
  try { (request as AuthenticatedRequest).auth = jwt.verify(token, secret()) as AuthContext; next(); }
  catch { return response.status(401).json({ success: false, message: "Invalid or expired token" }); }
};
export const authorize = (...roles: Role[]) => (request: Request, response: Response, next: NextFunction) => {
  const auth = getAuth(request);
  if (!auth || !roles.includes(auth.role)) return response.status(403).json({ success: false, message: "Insufficient permissions" });
  next();
};