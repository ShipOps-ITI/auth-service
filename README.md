# auth-service

Handles authentication and user management for the ShipOps platform.

## Stack

- Node.js + Express
- Prisma ORM + PostgreSQL
- JWT (access + refresh tokens)

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens |
| `PORT` | Port to run the service on (default: 5001) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_ORIGIN` | Allowed CORS origin |

## Local Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Create Default Admin User

```bash
npm run seed
```

This creates the following admin account if it doesn't already exist:

| Field | Value |
|---|---|
| Email | `admin@shipops.dev` |
| Password | `Admin@1234` |
| Role | `ADMIN` |

Change the password after first login.

## In Kubernetes

```bash
kubectl exec -it <auth-service-pod> -n shipops -- node prisma/seed.js
```

To find the pod name:

```bash
kubectl get pods -n shipops -l app=auth-service
```

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user |
| POST | `/login` | No | Login and receive access token |
| POST | `/logout` | Yes | Logout and clear refresh token |
| POST | `/refresh` | No | Refresh access token via cookie |
| POST | `/onboarding/company` | Yes | Complete company onboarding |

### Users — `/api/users`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/users` | ADMIN, COMPANY_ADMIN | List all users |
| GET | `/api/users/customers` | ADMIN, COMPANY_ADMIN, FLEET_MANAGER | List active customers |
| GET | `/api/users/:id` | ADMIN, COMPANY_ADMIN | Get user by ID |
| POST | `/api/users` | ADMIN, COMPANY_ADMIN | Create a user |
| PUT | `/api/users/:id` | ADMIN, COMPANY_ADMIN | Update a user |
| DELETE | `/api/users/:id` | ADMIN, COMPANY_ADMIN | Delete a user |
| PATCH | `/api/users/:id/role` | ADMIN, COMPANY_ADMIN | Update user role |

## Roles

| Role | Description |
|---|---|
| `ADMIN` | Full access across all companies |
| `COMPANY_ADMIN` | Manages users within their own company |
| `FLEET_MANAGER` | Read access to customers |
| `CUSTOMER` | End user |

## CI/CD

CI runs on every push to `main`:

1. Dependency audit — fails on critical CVEs
2. Secret scan — Gitleaks scans full git history
3. SAST — Semgrep static analysis (Node.js, JWT, Express rules)
4. Container scan — Trivy scans the built image
5. Push to ECR — only if all steps pass

CD is handled by ArgoCD Image Updater which polls ECR, detects the new tag, commits it to the k8s-manifest repo, and ArgoCD syncs the deployment automatically.
