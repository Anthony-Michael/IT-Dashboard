# DEPLOYMENT_PLAN

## Objective

Deploy the Phase 1 internal ticket dashboard with the lowest-maintenance setup, while keeping risk low and preserving separation between test and live Smartsheet environments.

---

## Recommended Stack

### Frontend
- **Vercel**
- Deploys the Next.js app from `frontend/`

### Backend
- **Render Web Service**
- Deploys the Node/Express API from the repo root

### Database
- **Render Postgres**
- Same region as backend

This setup is appropriate for a small internal app with low traffic and minimal operational overhead.

---

## Environment Strategy

Use **two environments**:

### Staging
- connected to the **test Smartsheet sheet**
- used for validation, smoke tests, and pilot testing

### Production
- connected to the **live Smartsheet sheet**
- only used after staging is stable

### Operational Rule
- **Staging always uses the test Smartsheet sheet**
- **Production always uses the live Smartsheet sheet**
- Never swap these casually

---

## Recommended Deployment Architecture

```text
Smartsheet (test/live) -> Backend API (Render) -> Postgres (Render) -> Frontend (Vercel)
```
