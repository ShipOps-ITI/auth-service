import prisma from "../config/prisma.js";

const roles = ["ADMIN", "FLEET_MANAGER", "CUSTOMER", "CAPTAIN", "PORT_OPERATOR"];

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch {
    res.status(500).json({ message: "Error retrieving users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: publicUserSelect,
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch {
    res.status(400).json({ message: "Invalid user ID" });
  }
};

const createUser = async (req, res) => {
  res.status(405).json({ message: "Create users through the registration endpoint" });
};

const updateUser = async (req, res) => {
  const userId = Number(req.params.id);
  const { role, companyId, isActive } = req.body;
  const data = {};

  if (role !== undefined) {
    if (!roles.includes(role)) {
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
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });
    res.json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Error updating user" });
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

export { getUsers, getUserById, createUser, updateUser, deleteUser };
