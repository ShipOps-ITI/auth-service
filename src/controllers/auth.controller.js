import authService from "../services/auth.service.js";
import prisma from "../config/prisma.js";

const register = async (req, res) => {
    try {
        const newUser = await authService.register(req.body);
        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // HTTPS only in production
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({
            message: "Login successful",
            user,
            accessToken, 
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token required" });
        }

        const { accessToken } = await authService.refreshAccessToken(refreshToken);
        res.status(200).json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: "Invalid refresh token" });
    }
};

const logout = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.user.userId }, // From JWT middleware
            data: { refreshToken: null },
        });

        res.clearCookie("refreshToken");
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export { register, login, logout, refresh };