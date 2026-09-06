# Neer Data Base Architecture

Welcome to the Neer-Data-Base repository.

## Installation & Starting Server on ZimaOS

If you are running this locally on ZimaOS, simply execute:

```bash
git fetch origin main
git merge origin/main
pnpm install
./setup.sh
docker-compose up -d --build
```

### Remote / API Triggered Update
To update the project remotely without using the CLI (Command Line), an endpoint has been created at:

`POST http://192.168.0.58:3000/api/system/update`

> **Note:** Because the API runs inside a Docker container, it cannot execute `docker-compose` on the host directly by default. For the API to be able to restart its own container or trigger host scripts, you would need to mount the docker socket into the API container.

A bash script `update_zimaos.sh` is available in the root of the project to manually pull and compile.

## Core Modules implemented:
- Users
- Billing Cycles
- Subscriptions
- Invoices
- Payments
- Usage & Idempotency Engine
