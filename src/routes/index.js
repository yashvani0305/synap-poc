// src/routes/index.js
import express from "express";

import authRoutes from "./auth.routes.js";
import eventRoutes from "./event.routes.js";

import { verifyJWT } from "../middleware/jwt.js";

const router = express.Router();

// Public routes
router.use("/auth", authRoutes);

// Event API — protected by JWT; userId is decoded from token inside verifyJWT
router.use("/event", verifyJWT, eventRoutes);

export default router;
