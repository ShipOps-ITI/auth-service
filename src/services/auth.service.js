import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const toPublicUser = ({ password, refreshToken, ...user }) => user;

const register = async (data) => {
    const { email, password, name, role = "CUSTOMER" } = data;

    try {
        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
            },
        });
        return toPublicUser(newUser);
    } catch (error) {
        throw error;
    }
};

const login = async (data) => {
    const { email, password } = data;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("Invalid email or password");

        if (!user.isActive) throw new Error("This account has been deactivated");

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error("Invalid email or password");

        const payload = {
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
        };

        // Generate tokens
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "15m", // SHORT
        });

        const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "7d", // LONG
        });

        // Save refresh token to DB
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        return { user: toPublicUser(user), accessToken, refreshToken };
    } catch (error) {
        throw error;
    }
};

const refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !user.isActive || user.refreshToken !== refreshToken) {
            throw new Error("Invalid refresh token");
        }

        const payload = {
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
        };

        // Generate new access token
        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m",
        });

        return { accessToken: newAccessToken };
    } catch (error) {
        throw error;
    }
};

export default { register, login, refreshAccessToken };
