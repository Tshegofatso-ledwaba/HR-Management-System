import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001").split(",").map((origin) => origin.trim()).filter(Boolean);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const deployedOriginPattern = /^https?:\/\/.*\.(vercel\.app|netlify\.app|github\.dev|onrender\.com|railway\.app|fly\.dev)$/i;

const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return localOriginPattern.test(origin) || deployedOriginPattern.test(origin);
};

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_request, response) => response.json({ success: true, message: "HRFlow API is healthy" }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;