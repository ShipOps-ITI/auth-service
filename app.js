import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import userRoutes from "./src/routes/users.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import subscriptionRoutes from "./src/routes/subscription.routes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || '*', // Allow runtime-configured frontend origin (set in K8s)
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

app.use("/auth", authRoutes);
app.use("/auth", userRoutes);
app.use("/auth", subscriptionRoutes);

export default app;

