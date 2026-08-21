import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

const VALID_ROLES = ["ADMIN", "COMPANY_ADMIN", "FLEET_MANAGER", "CUSTOMER"];
const COMPANY_ROLES = ["COMPANY_ADMIN", "FLEET_MANAGER"];
const MEMBERSHIP_ROLE = {
  COMPANY_ADMIN: "COMPANY_ADMIN",
  FLEET_MANAGER: "FLEET_MANAGER",
  CUSTOMER: "CUSTOMER",
};

const safeUser = ({ password, refreshToken, ...rest }) => rest;
const companyIdIsValid = (companyId) => Number.isInteger(companyId) && companyId > 0;
const isSuperAdmin = (req) => req.user.role === "ADMIN";
const scopedUserWhere = (req) => isSuperAdmin(req) ? {} : { companyId: Number(req.user.companyId) };
const canManageUser = (req, user) => isSuperAdmin(req) || user.companyId === Number(req.user.companyId);

const membershipData = (role, companyId, invitedByUserId) => {
  const membershipRole = MEMBERSHIP_ROLE[role];
  if (!membershipRole || !companyIdIsValid(companyId)) return undefined;

  return {
    create: { companyId, role: membershipRole, invitedByUserId },
  };
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: scopedUserWhere(req),
      include: { memberships: { orderBy: { joinedAt: "asc" } } },
      orderBy: { name: "asc" },
    });
    res.json(users.map(safeUser));
  } catch {
    res.status(500).json({ message: "Error retrieving users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: { memberships: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!canManageUser(req, user)) return res.status(403).json({ message: "You cannot manage users outside your company." });
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ message: "Error retrieving user" });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, role, companyId: requestedCompanyId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Missing required fields: name, email, password" });

  const creatableRoles = isSuperAdmin(req)
    ? ["COMPANY_ADMIN", "FLEET_MANAGER", "CUSTOMER"]
    : ["FLEET_MANAGER", "CUSTOMER"];
  if (!creatableRoles.includes(role)) {
    return res.status(403).json({ message: `You can create only: ${creatableRoles.join(", ")}` });
  }

  const companyId = isSuperAdmin(req) ? Number(requestedCompanyId) || null : Number(req.user.companyId);
  if (COMPANY_ROLES.includes(role) && !companyIdIsValid(companyId)) {
    return res.status(400).json({ message: "A Company Admin or Fleet Manager must be assigned to a company." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        companyId,
        memberships: membershipData(role, companyId, req.user.userId),
      },
      include: { memberships: true },
    });
    res.status(201).json(safeUser(user));
  } catch {
    res.status(500).json({ message: "Error creating user" });
  }
};

const updateUser = async (req, res) => {
  const userId = Number(req.params.id);
  const { role, companyId: requestedCompanyId, isActive } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (!canManageUser(req, existing)) return res.status(403).json({ message: "You cannot manage users outside your company." });

    const nextRole = role ?? existing.role;
    if (!VALID_ROLES.includes(nextRole)) return res.status(400).json({ message: "Invalid role" });
    if (!isSuperAdmin(req) && !["FLEET_MANAGER", "CUSTOMER"].includes(nextRole)) {
      return res.status(403).json({ message: "Company Admins can manage only Fleet Managers and Customers." });
    }

    const nextCompanyId = isSuperAdmin(req)
      ? (requestedCompanyId === undefined ? existing.companyId : requestedCompanyId)
      : Number(req.user.companyId);
    if (COMPANY_ROLES.includes(nextRole) && !companyIdIsValid(nextCompanyId)) {
      return res.status(400).json({ message: "A Company Admin or Fleet Manager must be assigned to a company." });
    }

    const data = {
      role: nextRole,
      companyId: nextCompanyId ?? null,
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    };
    const user = await prisma.user.update({ where: { id: userId }, data, include: { memberships: true } });
    if (companyIdIsValid(nextCompanyId) && MEMBERSHIP_ROLE[nextRole]) {
      await prisma.companyMembership.upsert({
        where: { userId_companyId: { userId, companyId: nextCompanyId } },
        create: { userId, companyId: nextCompanyId, role: MEMBERSHIP_ROLE[nextRole], invitedByUserId: req.user.userId },
        update: { role: MEMBERSHIP_ROLE[nextRole], status: "ACTIVE" },
      });
    }
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ message: "Error updating user" });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER", isActive: true, ...scopedUserWhere(req) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, companyId: true },
    });
    res.json(customers);
  } catch {
    res.status(500).json({ message: "Error retrieving customers" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!canManageUser(req, user)) return res.status(403).json({ message: "You cannot manage users outside your company." });
    await prisma.user.delete({ where: { id: user.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Error deleting user" });
  }
};

const updateUserRole = updateUser;

export { getUsers, getUserById, getCustomers, createUser, updateUser, deleteUser, updateUserRole, safeUser, VALID_ROLES };
