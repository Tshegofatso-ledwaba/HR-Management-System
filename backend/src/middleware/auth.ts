import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
const secret = () => process.env.JWT_SECRET || "development-only-secret-change-me";
export const authenticate = (request: Request, response: Response, next: NextFunction) => {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ success: false, message: "Authentication required" });
  try { request.auth = jwt.verify(token, secret()) as Request["auth"]; next(); }
  catch { return response.status(401).json({ success: false, message: "Invalid or expired token" }); }
};
export const authorize = (...roles: Role[]) => (request: Request, response: Response, next: NextFunction) => {
  if (!request.auth || !roles.includes(request.auth.role)) return response.status(403).json({ success: false, message: "Insufficient permissions" });
  next();
};