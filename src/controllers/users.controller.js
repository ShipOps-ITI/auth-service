import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

const VALID_ROLES = ['ADMIN', 'FLEET_MANAGER', 'CUSTOMER'];
const CREATABLE_ROLES = ['FLEET_MANAGER', 'CUSTOMER'];

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
    const { name, email, password, role, companyId } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields: name, email, password' });
    }

    // Validate role if provided
    if (!CREATABLE_ROLES.includes(role)) {
        return res.status(400).json({
            message: `Admin can create only: ${CREATABLE_ROLES.join(', ')}`
        });
    }

    if (role === 'FLEET_MANAGER' && (!Number.isInteger(companyId) || companyId <= 0)) {
        return res.status(400).json({ message: 'A Fleet Manager must be assigned to a company.' });
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
                role,
                companyId: role === 'FLEET_MANAGER' ? companyId : null,
            }
        });

        res.status(201).json(safeUser(user));
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

const updateUser = async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role, companyId, isActive } = req.body;
  const data = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    data.role = role;
  }

  if (companyId !== undefined) {
    if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) {
      return res.status(400).json({ message: "companyId must be a positive integer or null" });
    }
    data.companyId = companyId;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false" });
    }
    data.isActive = isActive;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "Provide a role, company assignment, or active status" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const nextRole = role ?? existing.role;
    const nextCompanyId = companyId === undefined ? existing.companyId : companyId;
    if (nextRole === 'FLEET_MANAGER' && (!Number.isInteger(nextCompanyId) || nextCompanyId <= 0)) {
      return res.status(400).json({ message: 'A Fleet Manager must be assigned to a company.' });
    }
    if (nextRole === 'ADMIN' || nextRole === 'CUSTOMER') data.companyId = null;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    res.json(safeUser(user));
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Error updating user" });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
    res.json(customers);
  } catch {
    res.status(500).json({ message: 'Error retrieving customers' });
  }
};

const deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Error deleting user" });
  }
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

        if (role === 'FLEET_MANAGER' && (!Number.isInteger(existing.companyId) || existing.companyId <= 0)) {
            return res.status(400).json({
                message: 'Assign a company using the user update endpoint before making this user a Fleet Manager.'
            });
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { role, ...(role === 'ADMIN' || role === 'CUSTOMER' ? { companyId: null } : {}) }
        });

        res.json(safeUser(updated));
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error });
    }
};

export { getUsers, getUserById, getCustomers, createUser, updateUser, deleteUser, updateUserRole, safeUser, VALID_ROLES };
