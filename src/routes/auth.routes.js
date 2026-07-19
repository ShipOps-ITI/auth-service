import express from "express";
import { register, login, logout, refresh } from "../controllers/auth.controller.js";
import authenticate from '../middleware/authenticate.js';


const authRoutes = express.Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", authenticate, logout);
authRoutes.post("/refresh", refresh);

export default authRoutes;