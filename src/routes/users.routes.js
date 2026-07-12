import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users.controller.js';

const userRoutes = express.Router();

userRoutes.get('/api/users', getUsers);
userRoutes.get('/api/users/:id', getUserById);
userRoutes.post('/api/users', createUser);
userRoutes.put('/api/users/:id', updateUser);
userRoutes.delete('/api/users/:id', deleteUser);

export default userRoutes;