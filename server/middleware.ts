import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  next();
}

export function requireRestaurant(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.restaurantId) {
    req.session.restaurantId = "rst_demo";
  }
  next();
}
