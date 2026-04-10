import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ─── Mock external deps before importing service ───────────────────────────
vi.mock("../config/db.js", () => ({
  default: { from: vi.fn() },
}));

vi.mock("../services/matrix.service.js", () => ({
  loginToMatrix: vi.fn(),
  logoutFromMatrix: vi.fn(),
  updateMatrixUserPassword: vi.fn(),
}));

vi.mock("axios");

import SQL from "../config/db.js";
import { loginToMatrix, logoutFromMatrix, updateMatrixUserPassword } from "../services/matrix.service.js";
import { signupService, loginService, logoutService, updatePasswordService } from "../services/auth.service.js";

const mockChain = (returnValue) => {
  const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), insert: vi.fn(), update: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.single.mockResolvedValue(returnValue);
  chain.insert.mockResolvedValue(returnValue);
  chain.update.mockResolvedValue(returnValue);
  return chain;
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = "test_secret";
  process.env.MATRIX_BASE_URL = "http://matrix.test";
});

// ─── SIGNUP ────────────────────────────────────────────────────────────────
describe("signupService", () => {
  it("throws if email format is invalid", async () => {
    await expect(
      signupService("testuser", "not-an-email", "pass123")
    ).rejects.toThrow("Invalid email format");
  });

  it("throws if Supabase insert fails", async () => {
    loginToMatrix.mockResolvedValue({ access_token: "admin-token" });

    const { default: axios } = await import("axios");
    axios.put = vi.fn().mockResolvedValue({});

    const chain = mockChain({ error: { message: "duplicate key" } });
    SQL.from.mockReturnValue(chain);

    await expect(
      signupService("testuser", "test@example.com", "pass123")
    ).rejects.toMatchObject({ message: "duplicate key" });
  });

  it("creates user successfully", async () => {
    loginToMatrix.mockResolvedValue({ access_token: "admin-token" });

    const { default: axios } = await import("axios");
    axios.put = vi.fn().mockResolvedValue({});

    const chain = mockChain({ error: null });
    SQL.from.mockReturnValue(chain);

    const result = await signupService("testuser", "test@example.com", "pass123");

    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("matrixUserId");
    expect(result.matrixUserId).toBe("@testuser:localhost");
  });
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
describe("loginService", () => {
  it("throws if email format is invalid", async () => {
    await expect(loginService("not-an-email", "pass123")).rejects.toThrow("Invalid email format");
  });

  it("throws if user not found", async () => {
    const chain = mockChain({ data: null, error: { message: "not found" } });
    SQL.from.mockReturnValue(chain);

    await expect(loginService("test@example.com", "pass123")).rejects.toThrow("User not found");
  });

  it("throws if password is wrong", async () => {
    const hashed = await bcrypt.hash("correctpass", 10);
    const chain = mockChain({ data: { id: "uid1", username: "testuser", email: "test@example.com", password: hashed }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(loginService("test@example.com", "wrongpass")).rejects.toThrow("Invalid password");
  });

  it("returns jwtToken and matrixToken on success", async () => {
    const hashed = await bcrypt.hash("pass123", 10);
    const chain = mockChain({
      data: { id: "uid1", username: "testuser", email: "test@example.com", password: hashed, matrixUserId: "@testuser:localhost" },
      error: null,
    });
    SQL.from.mockReturnValue(chain);

    const { default: axios } = await import("axios");
    axios.post = vi.fn().mockResolvedValue({ data: { access_token: "mx-token", device_id: "dev1" } });

    const result = await loginService("test@example.com", "pass123");

    expect(result).toHaveProperty("jwtToken");
    expect(result).toHaveProperty("matrixToken", "mx-token");
    expect(result.userId).toBe("uid1");

    const decoded = jwt.verify(result.jwtToken, "test_secret");
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.username).toBe("testuser");
  });
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────
describe("logoutService", () => {
  it("calls logoutFromMatrix when token provided", async () => {
    await logoutService("mx-token-123");
    expect(logoutFromMatrix).toHaveBeenCalledWith("mx-token-123");
  });

  it("does not call logoutFromMatrix when no token", async () => {
    await logoutService(undefined);
    expect(logoutFromMatrix).not.toHaveBeenCalled();
  });
});

// ─── UPDATE PASSWORD ───────────────────────────────────────────────────────
describe("updatePasswordService", () => {
  it("throws if user not found", async () => {
    const chain = mockChain({ data: null, error: { message: "not found" } });
    SQL.from.mockReturnValue(chain);

    await expect(updatePasswordService("uid1", "oldpass", "newpass")).rejects.toThrow("User not found");
  });

  it("throws if current password is wrong", async () => {
    const hashed = await bcrypt.hash("correctpass", 10);
    const chain = mockChain({ data: { id: "uid1", username: "testuser", password: hashed }, error: null });
    SQL.from.mockReturnValue(chain);

    await expect(updatePasswordService("uid1", "wrongpass", "newpass")).rejects.toThrow("Current password is incorrect");
  });

  it("updates password in DB and Matrix on success", async () => {
    const hashed = await bcrypt.hash("oldpass", 10);

    const selectChain = mockChain({ data: { id: "uid1", username: "testuser", password: hashed }, error: null });
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    SQL.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    updateMatrixUserPassword.mockResolvedValue();

    await updatePasswordService("uid1", "oldpass", "newpass");

    expect(updateMatrixUserPassword).toHaveBeenCalledWith("testuser", "newpass");
  });
});
