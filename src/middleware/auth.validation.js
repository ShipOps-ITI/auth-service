const REGISTRATION_ROLES = [
  "ADMIN",
  "COMPANY_ADMIN",
  "FLEET_MANAGER",
  "CUSTOMER",
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendValidationError = (res, errors) =>
  res.status(400).json({
    error: "Validation failed",
    errors,
  });

const registerValidation = (req, res, next) => {
  const { name, email, password, role } = req.body ?? {};
  const errors = [];

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    errors.push({ field: "name", message: "Name must be between 2 and 100 characters" });
  }

  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    errors.push({ field: "password", message: "Password must be between 8 and 128 characters" });
  }

  if (role !== undefined && !REGISTRATION_ROLES.includes(role)) {
    errors.push({ field: "role", message: `Role must be one of: ${REGISTRATION_ROLES.join(", ")}` });
  }

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  req.body = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    ...(role !== undefined && { role }),
  };

  next();
};

const loginValidation = (req, res, next) => {
  const { email, password } = req.body ?? {};
  const errors = [];

  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (typeof password !== "string" || password.length === 0 || password.length > 128) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  req.body = {
    email: email.trim().toLowerCase(),
    password,
  };

  next();
};

export { registerValidation, loginValidation };
