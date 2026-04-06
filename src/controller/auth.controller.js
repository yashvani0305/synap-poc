import { loginService, signupService, logoutService } from "../services/auth.service.js";
import { loginToMatrix } from "../services/matrix.service.js";

export const login1 = async (req, res) => {
  try {
    const { username, password } = req.body;
    const data = await loginToMatrix(username, password);
    res.json({
      accessToken: data.access_token,
      userId: data.user_id,
      deviceId: data.device_id,
    });
  } catch (err) {
    res.status(500).json({
      error: "Matrix login failed",
      details: err.response?.data || err.message,
    });
  }
};

const signup = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await signupService(username, password);
    res.json({ message: "User created", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await loginService(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const matrixToken = req.headers["x-matrix-token"];
    await logoutService(matrixToken);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export { signup, login, logout };
