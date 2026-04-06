import axios from "axios";

const BASE_URL = process.env.MATRIX_BASE_URL;

const loginToMatrix = async () => {
  const res = await axios.post(`${BASE_URL}/_matrix/client/v3/login`, {
    type: "m.login.password",
    identifier: {
      type: "m.id.user",
      user: process.env.MATRIX_ADMIN_USER,
    },
    password: process.env.MATRIX_ADMIN_PASS,
  });

  return res.data;
};

const verifyToken = async (token) => {
  const res = await axios.get(`${BASE_URL}/_matrix/client/v3/account/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
};

const logoutFromMatrix = async (matrixToken) => {
  await axios.post(
    `${BASE_URL}/_matrix/client/v3/logout`,
    {},
    { headers: { Authorization: `Bearer ${matrixToken}` } },
  );
};

export { loginToMatrix, verifyToken, logoutFromMatrix };
