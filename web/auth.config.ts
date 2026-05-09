import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Edge-safe config (no Prisma adapter here — only used by middleware).
export const authConfig: NextAuthConfig = {
  providers: [Google, GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuthorize = nextUrl.pathname.startsWith("/cli/authorize");
      if (isOnDashboard || isOnAuthorize) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
};
