import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import userRoutes from "./src/routes/users.routes.js";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

app.use(userRoutes);
app.use(authRoutes);

export default app;