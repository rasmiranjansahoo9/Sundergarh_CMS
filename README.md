# Sundergarh Forest & Wildlife — Node.js + React Secure CMS

A production-oriented full-stack CMS foundation replacing the previous PHP CMS. It uses React/Vite for the admin UI, Node.js/Express for the API, PostgreSQL + Prisma for data, Argon2 password hashing, HttpOnly/SameSite session cookies, CSRF protection, rate limiting, Helmet, RBAC, audit logs and isolated uploads.

## Portal coverage
Home, About Us, Forest Conservation, Wildlife, Divisions & Ranges, Schemes & Initiatives, Eco-Tourism, Media & Gallery, Publications, News, Notifications, Tenders, RTI, Grievance, Contact Us and Search.

## CMS architecture
- React responsive admin dashboard
- Node.js/Express REST API
- PostgreSQL database via Prisma
- Secure role model: SUPER_ADMIN, EDITOR, MEDIA_MANAGER, VIEWER
- Page editor with draft/published workflow
- Media library upload endpoint for images/PDF/video
- Public APIs for pages/news/videos/publications/officers/ranges
- Audit logging
- 25 MB upload ceiling and MIME allowlist
- No application code is stored in the database
- Uploaded files are kept in a separate volume

## Production security checklist
1. Replace every CHANGE_THIS value.
2. Use HTTPS and set NODE_ENV=production.
3. Put the application behind a reverse proxy/WAF.
4. Restrict PostgreSQL to the private network; never expose port 5432 publicly.
5. Back up PostgreSQL and the uploads volume.
6. Delete development/demo credentials before deployment.
7. Create the first admin using a generated Argon2 password hash or a secure provisioning command; never commit a password.
8. Add antivirus/content scanning for uploaded files in the production environment.
9. Add server-side HTML sanitization before allowing rich HTML from editors.
10. Add CSP nonces/hashes appropriate to the final frontend deployment.

## Local setup
```bash
cp server/.env.example server/.env
# edit DATABASE_URL and SESSION_SECRET
npm install
npm run db:generate
npx prisma --schema=prisma/schema.prisma db push
ADMIN_EMAIL=admin@example.gov.in ADMIN_PASSWORD='use-a-long-random-password-here' npm run seed
npm run dev
```

For Docker, edit `docker-compose.yml` secrets first, then run `docker compose up --build`.

## Design migration
The existing Sundergarh portal visual pages remain the design/content reference. Migrate each approved final page into the database and connect its React/public rendering to the public APIs. Do not overwrite verified government content with placeholders.
