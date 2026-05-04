import { Router } from "express";
import { requireAuth, requireAnyPermission } from "../middlewares/auth.middleware.js";
import { DashboardController } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/overview",
  requireAnyPermission(
    "project:read",
    "task:read",
    "incident:read",
    "report:read",
    "budget:read",
  ),
  DashboardController.getOverview,
);

export default dashboardRouter;
