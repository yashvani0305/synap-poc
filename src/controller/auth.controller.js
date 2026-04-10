import { loginService, signupService, logoutService, updatePasswordService } from "../services/auth.service.js";
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
    const { username, email, password } = req.body;
    const result = await signupService(username, email, password);
    res.json({ message: "User created", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
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

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }

    await updatePasswordService(userId, currentPassword, newPassword);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export { signup, login, logout, updatePassword };
