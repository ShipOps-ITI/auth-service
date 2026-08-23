import express from 'express';
import { getUsers, getUserById, getCustomers, createUser, updateUser, deleteUser, updateUserRole } from '../controllers/users.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';

const userRoutes = express.Router();

userRoutes.get('/users', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), getUsers);
userRoutes.get('/users/customers', authenticate, authorize('ADMIN', 'COMPANY_ADMIN', 'FLEET_MANAGER'), getCustomers);
userRoutes.get('/users/:id', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), getUserById);
userRoutes.post('/users', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), createUser);
userRoutes.put('/users/:id', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), updateUser);
userRoutes.delete('/users/:id', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), deleteUser);
userRoutes.patch('/users/:id/role', authenticate, authorize('ADMIN', 'COMPANY_ADMIN'), updateUserRole);

export default userRoutes;
