import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;

      console.log(token);
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