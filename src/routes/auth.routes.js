import express from "express";
import { login, login1, signup, logout, updatePassword } from "../controller/auth.controller.js";
import { verifyJWT } from "../middleware/jwt.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/login1", login1);
router.post("/logout", verifyJWT, logout);
router.put("/update-password", verifyJWT, updatePassword);

export default router;
