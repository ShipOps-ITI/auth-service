import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const register = async (data) => {
    const { username, email, password, name } = data;

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
                username,
                email,
                password: hashedPassword,
                name,
                role: "CUSTOMER", // Default role, you can change this as needed
            },
        });
        return newUser;
    } catch (error) {
        throw error;
    }
};

const login = async (data) => {
    const { email, password } = data;

    try {
        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new Error("Invalid email or password");
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error("Invalid email or password");
        }

        const payload = { userId: user.id, role: user.role };

        // Generate a JWT token
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        });

        return { user, token };
    } catch (error) {
        throw error;
    }
};


export default {
    register,
    login,
};  