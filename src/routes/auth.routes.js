import express from "express";
import { register, login, logout, refresh } from "../controllers/auth.controller.js";
import authenticate from '../middleware/authenticate.js';
import { registerValidation, loginValidation } from "../middleware/auth.validation.js";


const authRoutes = express.Router();

authRoutes.post("/register", registerValidation, register);
authRoutes.post("/login", loginValidation, login);
authRoutes.post("/logout", authenticate, logout);
authRoutes.post("/refresh", refresh);

export default authRoutes;
