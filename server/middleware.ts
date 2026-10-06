import type { Request, Response, NextFunction } from "express";

/** Demo abierta: adjunta el restaurante demo. La estructura queda para auth futura. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.session.userId = req.session.userId ?? "usr_demo";
  req.session.restaurantId = req.session.restaurantId ?? "rst_demo";
  req.session.email = req.session.email ?? "demo@mipsconnect.mx";
  next();
}

export function requireRestaurant(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.restaurantId) {
    req.session.restaurantId = "rst_demo";
  }
  next();
}
