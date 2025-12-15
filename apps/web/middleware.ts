import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // If not authorized, NextAuth will redirect to /login automatically.
  // We include a ?redirect= param so we can return after login.

  const token = req.nextauth.token;
  if (!token && pathname.startsWith("/auth/organizations")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
},{
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;

      // for any /auth/admin/* routes, require token.isAdmin === true
      if (pathname.startsWith("/auth/admin")) {
        return token?.user.isAdmin === true;
      }

      // for all other /auth/* routes, just require a valid session
      return !!token;
    },
  },
});


export const config = {
    matcher: ["/auth/:path*"],
}