import { Router } from "express";
import authRouter from './auth.routes.js';
import projectRouter from './project.routes.js';
import resourceRouter from './resource.routes.js';
import procurementRouter from './procurement.routes.js';
import financeRouter from './finance.routes.js';
import contractRouter from './contract.routes.js';
import dailyLogRouter from './daily-log.routes.js';
import weeklyReportRouter from './weekly-report.routes.js';
import inspectionRouter from './inspection.routes.js';
import punchItemRouter from './punch-item.routes.js';
import incidentRouter from './incident.routes.js';
import seedRouter from './seed.routes.js';
import rbacRouter from './rbac.routes.js';

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/projects", projectRouter);
router.use("/resources", resourceRouter);
router.use("/procurement", procurementRouter);
router.use("/finance", financeRouter);
router.use("/contracts", contractRouter);
router.use("/daily-logs", dailyLogRouter);
router.use("/weekly-reports", weeklyReportRouter);
router.use("/inspections", inspectionRouter);
router.use("/punch-items", punchItemRouter);
router.use("/incidents", incidentRouter);
router.use("/seed", seedRouter);
router.use("/rbac", rbacRouter);

export default router;
