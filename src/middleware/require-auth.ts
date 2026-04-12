import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../auth/jwt";

// Attach the verified user to the request so route handlers can use it.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
