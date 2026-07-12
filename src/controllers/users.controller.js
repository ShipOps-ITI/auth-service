import prisma from "../config/prisma.js";

let getUsers = (req, res) => {
    prisma.user.findMany()
        .then(users => {
            res.json(users);
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
                res.json(user);
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        })
        .catch(error => {
            res.status(500).json({ message: 'Error retrieving user', error });
        });
};

let createUser = (req, res) => {
    const newUser = req.body;
    prisma.user.create({
        data: newUser
    })
        .then(user => {
            res.status(201).json(user);
        })
        .catch(error => {
            res.status(500).json({ message: 'Error creating user', error });
        });
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

export { getUsers, getUserById, createUser, updateUser, deleteUser };
