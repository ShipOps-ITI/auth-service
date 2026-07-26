import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';

const userRoutes = express.Router();

userRoutes.get('/api/users', authenticate, authorize('ADMIN'), getUsers);
userRoutes.get('/api/users/:id', authenticate, authorize('ADMIN'), getUserById);
userRoutes.post('/api/users', authenticate, authorize('ADMIN'), createUser);
userRoutes.put('/api/users/:id', authenticate, authorize('ADMIN'), updateUser);
userRoutes.delete('/api/users/:id', authenticate, authorize('ADMIN'), deleteUser);

export default userRoutes;
