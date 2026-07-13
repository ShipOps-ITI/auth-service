const authorize = (...roles) => {

    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Forbidden User role: ${req.user.role}, Required roles: ${roles}`
            });
        }

        next();
    };

};

export default authorize;