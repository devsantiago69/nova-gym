import "next-auth";
import "next-auth/jwt";

type UserRole = "ADMIN" | "USER";
type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING_PASSWORD_CHANGE";

declare module "next-auth" {
  interface User {
    role: UserRole;
    status: UserStatus;
    authVersion: number;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    authVersion: number;
  }
}
