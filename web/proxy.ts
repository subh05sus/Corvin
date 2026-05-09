import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Run middleware on dashboard and CLI authorize pages only.
  matcher: ["/dashboard/:path*", "/cli/authorize"],
};
