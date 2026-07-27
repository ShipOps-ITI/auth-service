import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

const VALID_ROLES = ['ADMIN', 'FLEET_MANAGER', 'CUSTOMER', 'CAPTAIN', 'PORT_OPERATOR'];

const safeUser = ({ password, refreshToken, ...rest }) => rest;

let getUsers = (req, res) => {
    prisma.user.findMany()
        .then(users => {
            res.json(users.map(safeUser));
        })
        .catch(error => {
            res.status(500).json({ message: 'Error retrieving users', error });
        });
};

let getUserById = (req, res) => {
    const userId = parseInt(req.params.id);
    prisma.user.findUnique({
        where: { id: userId }
    })
        .then(user => {
            if (user) {
                res.json(safeUser(user));
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        })
        .catch(error => {
            res.status(500).json({ message: 'Error retrieving user', error });
        });
};

let createUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields: name, email, password' });
    }

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
        return res.status(400).json({
            message: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`
        });
    }

    try {
        // Check for duplicate email
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'CUSTOMER',
            }
        });

        res.status(201).json(safeUser(user));
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

let updateUser = (req, res) => {
    const userId = parseInt(req.params.id);
    const updatedData = req.body;
    prisma.user.update({
        where: { id: userId },
        data: updatedData
    })
        .then(user => {
            res.json(user);
        })
        .catch(error => {
            res.status(500).json({ message: 'Error updating user', error });
        });
};

let deleteUser = (req, res) => {
    const userId = parseInt(req.params.id);
    prisma.user.delete({
        where: { id: userId }
    })
        .then(user => {
            res.json(user);
        })
        .catch(error => {
            res.status(500).json({ message: 'Error deleting user', error });
        });
};

let updateUserRole = async (req, res) => {
    const targetId = parseInt(req.params.id);
    const { role } = req.body;

    // Prevent self-role-change
    if (req.user.userId === targetId) {
        return res.status(403).json({ message: 'Cannot change your own role' });
    }

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({
            message: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`
        });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { id: targetId } });
        if (!existing) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { role }
        });

        res.json(safeUser(updated));
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
};

export { getUsers, getUserById, createUser, updateUser, deleteUser, updateUserRole, safeUser, VALID_ROLES };
