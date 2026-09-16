# Deployment notes

## Current tested application

The project is a Node.js/Express API with a React/Vite admin client and Prisma/PostgreSQL.
The current working source is preserved as-is apart from removal of local-only files
and secrets from the Git distribution.

## Required production configuration

- Managed PostgreSQL database
- `DATABASE_URL`
- Strong production secrets
- Production `CLIENT_ORIGIN`
- HTTPS
- Persistent/object storage for CMS media uploads rather than relying on ephemeral
  application filesystem storage

## Important

Do not copy the local `.env` into GitHub. Use `.env.example` as the template.
Do not commit `node_modules`, local uploads, database files, or credentials.

For Vercel specifically, validate the Express API/serverless entry-point and media
storage strategy before production deployment. The current source was tested locally
and is packaged here as a clean Git repository source; deployment-specific changes
should be tested separately rather than silently changing the working application.
