import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import argon2 from "argon2";
import { prisma } from "@gymchallenge/database";
import { loginSchema } from "@/modules/auth/validators/login";

const authSecret = process.env.AUTH_SECRET;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        identifier: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const identifier = parsed.data.identifier;
        const user = await prisma.user.findFirst({
          where: { deletedAt: null, username: identifier },
          include: { profile: true },
        });
        if (!user) {
          await argon2.hash(parsed.data.password);
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;
        if (user.status === "INACTIVE" || user.status === "SUSPENDED")
          return null;
        const valid = await argon2.verify(
          user.passwordHash,
          parsed.data.password,
        );
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil =
            attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: attempts, lockedUntil },
            }),
            ...(lockedUntil
              ? [
                  prisma.auditLog.create({
                    data: {
                      actorId: user.id,
                      action: "AUTH_ACCOUNT_TEMPORARILY_LOCKED",
                      entityType: "User",
                      entityId: user.id,
                      correlationId: crypto.randomUUID(),
                      newValues: {
                        attempts,
                        lockedUntil: lockedUntil.toISOString(),
                      },
                    },
                  }),
                ]
              : []),
          ]);
          return null;
        }
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        return {
          id: user.id,
          email: user.email,
          name: `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim(),
          role: user.role,
          status: user.status,
          authVersion: user.passwordChangedAt?.getTime() ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.authVersion = user.authVersion;
      } else if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, status: true, passwordChangedAt: true },
        });
        if (
          current &&
          current.status !== "INACTIVE" &&
          current.status !== "SUSPENDED"
        ) {
          token.role = current.role;
          token.status = current.status;
          const currentAuthVersion = current.passwordChangedAt?.getTime() ?? 0;
          if (token.authVersion === undefined) {
            token.authVersion = currentAuthVersion;
          } else if (token.authVersion !== currentAuthVersion) {
            token.id = "";
            token.role = "USER";
            token.status = "INACTIVE";
          }
        } else {
          token.id = "";
          token.role = "USER";
          token.status = current?.status ?? "INACTIVE";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
  secret: authSecret ?? "development-only-secret-not-for-production",
  useSecureCookies: process.env.NODE_ENV === "production",
};
