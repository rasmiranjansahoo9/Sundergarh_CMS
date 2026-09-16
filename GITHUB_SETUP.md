# GitHub setup

This repository is prepared for GitHub. Real environment files, dependencies,
local uploads, OS metadata and editor settings are excluded by `.gitignore`.

## First push

```bash
git init
git branch -M main
git add .
git status
git commit -m "Initial Sundergarh Forest Wildlife CMS"
git remote add origin https://github.com/YOUR-USERNAME/sundergarh-forest-wildlife-cms.git
git push -u origin main
```

Create the GitHub repository as **Private** unless the source code is intended
to be public.

## Before deployment

Set production environment variables in the hosting platform. Do not commit
`.env` or database passwords.

The application uses PostgreSQL through Prisma. A local PostgreSQL URL such as
`127.0.0.1` is only for local development; production needs a reachable managed
PostgreSQL database.

The current application also contains legacy public HTML under
`server/legacy-public/`. Keep that directory in Git because it is part of the
current working site.
