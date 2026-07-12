import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./src/routes/users.routes.js";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(userRoutes);
app.use(authRoutes);

export default app;