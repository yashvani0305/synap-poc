// src/middleware/auth.js
import { verifyToken } from "../services/matrix.service.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token missing" });
    }

    const user = await verifyToken(token);

    req.user = user; // contains user_id
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
