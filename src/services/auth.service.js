import axios from "axios";
import SQL from "../config/db.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginToMatrix, logoutFromMatrix } from "./matrix.service.js";

const MATRIX_URL = process.env.MATRIX_BASE_URL;

const signupService = async (username, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const data = await loginToMatrix(username, password);
  const accessToken = data.access_token;

  const matrixUserId = `@${username}:localhost`;

  await axios.put(
    `${MATRIX_URL}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`,
    {
      password,
      displayname: username,
      admin: false,
      deactivated: false,
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const userId = uuid();

  const { error } = await SQL.from("users").insert([
    {
      id: userId,
      username,
      password: hashedPassword,
      matrixUserId,
    },
  ]);

  if (error) throw error;

  return { userId, matrixUserId };
};

const loginService = async (username, password) => {
  const { data, error } = await SQL.from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) throw new Error("User not found");

  const isValid = await bcrypt.compare(password, data.password);
  if (!isValid) throw new Error("Invalid password");

  const matrixRes = await axios.post(`${MATRIX_URL}/_matrix/client/v3/login`, {
    type: "m.login.password",
    identifier: { type: "m.id.user", user: username },
    password,
  });

  const token = jwt.sign(
    { userId: data.id, username: data.username },
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

const logoutService = async (matrixToken) => {
  if (matrixToken) {
    await logoutFromMatrix(matrixToken);
  }
};

export { signupService, loginService, logoutService };
