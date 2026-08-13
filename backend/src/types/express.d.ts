import type { Role } from "@prisma/client";

export type AuthContext = {
	userId: string;
	role: Role;
	employeeId?: string | null;
};

declare module "express-serve-static-core" {
	interface Request {
		auth?: AuthContext;
	}
}