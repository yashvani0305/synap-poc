import axios from "axios";
import SQL from "../config/db.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginToMatrix, logoutFromMatrix, updateMatrixUserPassword } from "./matrix.service.js";

const MATRIX_URL = process.env.MATRIX_BASE_URL;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signupService = async (username, email, password) => {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email format");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const data = await loginToMatrix();
  const accessToken = data.access_token;
  const matrixUserId = `@${username}:localhost`;

  await axios.put(
    `${MATRIX_URL}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`,
    { password, displayname: username, admin: false, deactivated: false },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const userId = uuid();

  const { error } = await SQL.from("users").insert([
    { id: userId, username, email, password: hashedPassword, matrixUserId },
  ]);

  if (error) throw error;

  return { userId, matrixUserId };
};

const loginService = async (email, password) => {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email format");
  }

  const { data, error } = await SQL.from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) throw new Error("User not found");

  const isValid = await bcrypt.compare(password, data.password);
  if (!isValid) throw new Error("Invalid password");

  const matrixRes = await axios.post(`${MATRIX_URL}/_matrix/client/v3/login`, {
    type: "m.login.password",
    identifier: { type: "m.id.user", user: data.username },
    password,
  });

  const token = jwt.sign(
    { userId: data.id, username: data.username, email: data.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  return {
    jwtToken: token,
    matrixToken: matrixRes.data.access_token,
    userId: data.id,
    matrixUserId: data.matrixUserId,
    matrixDeviceId: matrixRes.data.device_id,
  };
};

const updatePasswordService = async (userId, currentPassword, newPassword) => {
  const { data, error } = await SQL.from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("User not found");

  const isValid = await bcrypt.compare(currentPassword, data.password);
  if (!isValid) throw new Error("Current password is incorrect");

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await SQL.from("users")
    .update({ password: hashedPassword })
    .eq("id", userId);

  if (updateError) throw updateError;

  await updateMatrixUserPassword(data.username, newPassword);
};

const logoutService = async (matrixToken) => {
  if (matrixToken) {
    await logoutFromMatrix(matrixToken);
  }
};

export { signupService, loginService, logoutService, updatePasswordService };
