import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import userRoutes from "./src/routes/users.routes.js";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || '*', // Allow runtime-configured frontend origin (set in K8s)
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

// Mount user routes and auth routes under /auth so Ingress path-based routing works without rewrites
app.use('/auth', userRoutes);
app.use('/auth', authRoutes);

export default app;