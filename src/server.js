import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import router from "./routes/index.js";
import { swaggerSpec } from "./config/swagger.js";

dotenv.config();

const app = express();

app.use(cors([{ origin: process.env.CORS_ORIGIN, methods: ["GET", "POST"] }]));
app.use(express.json());

const swaggerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Swagger Docs"');
    return res.status(401).send("Authentication required");
  }

  const [user, pass] = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");

  if (user === process.env.SWAGGER_USER && pass === process.env.SWAGGER_PASS) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Swagger Docs"');
  return res.status(401).send("Invalid credentials");
};

app.use("/api-docs", swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", router);

app.get("/", (req, res) => res.send("Welcome to Synapp POC API"));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
  console.log(`Swagger docs → http://localhost:${process.env.PORT}/api-docs`);
});
