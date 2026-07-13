import authService from "../services/auth.service.js";

const register = async (req, res) => {
    try {
        const newUser = await authService.register(req.body);
        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { user, token } = await authService.login(req.body);
        res.status(200).json({ message: "Login successful", user, token });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

const logout = async (req, res) => {
    // todo
    res.status(200).json({ message: "Logout successful" });
};

export { register, login, logout };