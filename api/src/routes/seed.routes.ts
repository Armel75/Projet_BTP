import { Router } from "express";
import { SeedController } from '../controllers/seed.controller.js';

const seedRouter = Router();

seedRouter.post("/", SeedController.runSeed);

export default seedRouter;
