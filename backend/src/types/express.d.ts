import type { AuthenticatedUser } from "../modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Raw JSON body bytes, captured for webhook signature verification (e.g. Razorpay). */
      rawBody?: Buffer;
    }
  }
}
