import { withAuth } from "next-auth/middleware";

export default withAuth(function proxy() {}, {
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

export const config = {
  matcher: [
    "/inicio/:path*",
    "/asistencia/:path*",
    "/retos/:path*",
    "/comunidad/:path*",
    "/perfil/:path*",
    "/admin/:path*",
  ],
};
