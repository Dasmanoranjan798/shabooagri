import type { NextFunction, Request, Response } from "express";

// Express 4 does not forward a rejected promise from an async handler to
// error middleware on its own — this wraps a handler so any thrown/rejected
// error reaches errorMiddleware instead of hanging the request.
export function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
