import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const toPublicUser = ({ password, refreshToken, ...user }) => user;

const issueTokens = (user) => {
    const primaryMembership = user.memberships?.[0];
    const payload = {
        userId: user.id,
        role: user.role,
        companyId: primaryMembership?.companyId ?? user.companyId,
        membershipId: primaryMembership?.id ?? null,
    };

    return {
        accessToken: jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        }),
        refreshToken: jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "7d",
        }),
    };
};

const register = async (data) => {
    const allowTestRoles = process.env.ALLOW_TEST_ROLE_REGISTRATION === "true";
    const { email, password, name, role } = data;
    const registrationRole = allowTestRoles && ["ADMIN", "COMPANY_ADMIN", "FLEET_MANAGER", "CUSTOMER"].includes(role)
        ? role
        : "COMPANY_ADMIN";

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
                role: registrationRole,
                ...(registrationRole === "COMPANY_ADMIN"
                    ? { planTier: "FREE", subscriptionStatus: "PENDING" }
                    : {}),
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
        const user = await prisma.user.findUnique({
            where: { email },
            include: { memberships: { where: { status: "ACTIVE" }, orderBy: { joinedAt: "asc" }, take: 1 } },
        });
        if (!user) throw new Error("Invalid email or password");

        if (!user.isActive) throw new Error("This account has been deactivated");

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error("Invalid email or password");

        const { accessToken, refreshToken } = issueTokens(user);

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
            include: { memberships: { where: { status: "ACTIVE" }, orderBy: { joinedAt: "asc" }, take: 1 } },
        });

        if (!user || !user.isActive || user.refreshToken !== refreshToken) {
            throw new Error("Invalid refresh token");
        }

        const { accessToken: newAccessToken } = issueTokens(user);

        return { accessToken: newAccessToken };
    } catch (error) {
        throw error;
    }
};

const completeCompanyOnboarding = async (userId, companyId) => {
    if (!Number.isInteger(Number(companyId)) || Number(companyId) <= 0) {
        throw new Error("A valid company ID is required");
    }

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user || user.role !== "COMPANY_ADMIN") {
        throw new Error("Only Company Admin accounts can complete company onboarding");
    }
    if (user.companyId) {
        throw new Error("This account is already assigned to a company");
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            companyId: Number(companyId),
            memberships: {
                create: {
                    companyId: Number(companyId),
                    role: "COMPANY_ADMIN",
                    status: "ACTIVE",
                },
            },
        },
        include: { memberships: { where: { status: "ACTIVE" }, take: 1 } },
    });

    const { accessToken, refreshToken } = issueTokens(updatedUser);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { user: toPublicUser(updatedUser), accessToken, refreshToken };
};

export default { register, login, refreshAccessToken, completeCompanyOnboarding };
