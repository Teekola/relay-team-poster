import {
   convexAuthNextjsMiddleware,
   createRouteMatcher,
   nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInRoute = createRouteMatcher(["/sign-in"]);
const isAuthApiRoute = createRouteMatcher(["/api/auth(.*)"]);
const isPublicRoute = createRouteMatcher(["/"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
   if (isAuthApiRoute(request)) return;

   const isAuthenticated = await convexAuth.isAuthenticated();

   if (isSignInRoute(request)) {
      return isAuthenticated
         ? nextjsMiddlewareRedirect(request, "/dashboard")
         : undefined;
   }

   if (isPublicRoute(request)) return;

   if (!isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
   }
});

export const config = {
   matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
