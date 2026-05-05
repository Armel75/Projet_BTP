import { Router } from "express";
import { authenticateToken, requireAnyPermission } from "../middlewares/auth.middleware.js";
import { ValidationController } from "../controllers/validation.controller.js";

const validationRouter = Router();

validationRouter.use(authenticateToken);
validationRouter.use(
  requireAnyPermission(
    "purchase-order:approve",
    "change-order:approve",
    "control-report:approve",
    "invoice:approve",
    "budget:update"
  )
);

validationRouter.get("/pending", ValidationController.listPending);
validationRouter.post("/:entityType/:id/approve", ValidationController.approve);
validationRouter.post("/:entityType/:id/reject", ValidationController.reject);

export default validationRouter;
