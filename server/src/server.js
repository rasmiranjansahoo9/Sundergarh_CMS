'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const ROOT = path.resolve(__dirname, '..');
const LEGACY = path.resolve(ROOT, 'legacy-public');
const LEGACY_PAGES = path.join(LEGACY, 'pages');
const LEGACY_ASSETS = path.join(LEGACY, 'assets');

console.log('Legacy public directory:', LEGACY);
console.log('Legacy pages directory:', LEGACY_PAGES);
console.log('Legacy assets directory:', LEGACY_ASSETS);

/*
|--------------------------------------------------------------------------
| Basic validation
|--------------------------------------------------------------------------
*/

if (!fs.existsSync(LEGACY)) {
  console.error(`ERROR: legacy-public directory not found: ${LEGACY}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(LEGACY, 'index.html'))) {
  console.error(
    `ERROR: legacy-public/index.html not found: ${path.join(
      LEGACY,
      'index.html'
    )}`
  );
  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],

        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
        ],

        fontSrc: [
          "'self'",
          'https:',
          'data:',
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https:',
        ],

        scriptSrc: [
          "'self'",
          'https:',
        ],

        connectSrc: [
          "'self'",
          CLIENT_ORIGIN,
          'https:',
        ],
      },
    },
  })
);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);



/*
|--------------------------------------------------------------------------
| CSRF helper
|--------------------------------------------------------------------------
*/

function getCsrfToken(req, res) {
  let token = req.cookies?.csrfToken;

  if (!token) {
    token = crypto.randomBytes(32).toString('hex');

    res.cookie('csrfToken', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  return token;
}

function csrfProtection(req, res, next) {
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
    });
  }

  next();
}
/*
|--------------------------------------------------------------------------
| Authentication helpers
|--------------------------------------------------------------------------
*/

async function getCurrentUser(req) {
  const userId = req.cookies.cms_session;

  if (!userId) {
    return null;
  }

  try {
    return await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  } catch (error) {
    console.error('Authentication lookup failed:', error);
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);

  if (!user || user.active === false) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    next();
  };
}

/*
|--------------------------------------------------------------------------
| Audit logging
|--------------------------------------------------------------------------
*/

async function audit(
  ctx,
  action,
  type,
  id,
  details = {}
) {
  try {
    const userAgent =
      ctx.userAgent ??
      ctx.get?.('user-agent') ??
      ctx.headers?.['user-agent'] ??
      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: ctx.user?.id || null,
        action,
        entityType: type,
        entityId: id || null,
        ip: ctx.ip || 'unknown',
        userAgent: userAgent.slice(0, 500),
        details,
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
}

/*
|--------------------------------------------------------------------------
| CSRF endpoint
|--------------------------------------------------------------------------
*/

app.get('/api/auth/csrf', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  });

  res.json({ csrfToken });
});



/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ok: true,
      database: true,
      legacyPublic: true,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      database: false,
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

app.get('/api/auth/me', async (req, res) => {
  const user = await getCurrentUser(req);

  if (!user || user.active === false) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    },
  });
});

app.post(
  '/api/auth/login',
  csrfProtection,
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          email: String(email).toLowerCase().trim(),
        },
      });

      if (!user || user.active === false) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      const argon2 = require('argon2');

      const valid = await argon2.verify(
        user.passwordHash,
        password
      );

      if (!valid) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      res.cookie('cms_session', user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
      });

      await audit(
        {
          user,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
        'login',
        'user',
        user.id
      );

      res.json({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      res.status(500).json({
        error: 'Login failed',
      });
    }
  }
);

app.post(
  '/api/auth/logout',
  csrfProtection,
  async (req, res) => {
    const user = await getCurrentUser(req);

    if (user) {
      await audit(
        {
          user,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
        'logout',
        'user',
        user.id
      );
    }

    res.clearCookie('cms_session');

    res.json({
      ok: true,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Public API - Pages
|--------------------------------------------------------------------------
*/

app.get('/api/public/pages', async (req, res) => {
  try {
    const pages = await prisma.page.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        menuLabel: 'asc',
      },
      select: {
        id: true,
        slug: true,
        title: true,
        menuLabel: true,
        metaDescription: true,
        heroImage: true,
        updatedAt: true,
      },
    });

    res.json(pages);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Unable to load pages',
    });
  }
});

app.get('/api/public/pages/:slug', async (req, res) => {
  try {
    const page = await prisma.page.findUnique({
      where: {
        slug: req.params.slug,
      },
    });

    if (!page || page.status !== 'PUBLISHED') {
      return res.status(404).json({
        error: 'Page not found',
      });
    }

    res.json(page);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Unable to load page',
    });
  }
});

/*
|--------------------------------------------------------------------------
| Admin API - Pages
|--------------------------------------------------------------------------
*/

app.get(
  '/api/admin/pages',
  requireAuth,
  async (req, res) => {
    try {
      const pages = await prisma.page.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      });

      res.json(pages);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: 'Unable to load pages',
      });
    }
  }
);

app.get(
  '/api/admin/pages/:id',
  requireAuth,
  async (req, res) => {
    try {
      const page = await prisma.page.findUnique({
        where: {
          id: req.params.id,
        },
      });

      if (!page) {
        return res.status(404).json({
          error: 'Page not found',
        });
      }

      res.json(page);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: 'Unable to load page',
      });
    }
  }
);

app.patch(
  '/api/admin/pages/:id',
  requireAuth,
  requireRole(
    'SUPER_ADMIN',
    'EDITOR'
  ),
  csrfProtection,
  async (req, res) => {
    try {
      const {
        title,
        menuLabel,
        metaDescription,
        heroImage,
        bodyHtml,
        status,
      } = req.body || {};

      const page = await prisma.page.update({
        where: {
          id: req.params.id,
        },
        data: {
          ...(title !== undefined && { title }),
          ...(menuLabel !== undefined && { menuLabel }),
          ...(metaDescription !== undefined && {
            metaDescription,
          }),
          ...(heroImage !== undefined && {
            heroImage,
          }),
          ...(bodyHtml !== undefined && {
            bodyHtml,
          }),
          ...(status !== undefined && {
            status,
          }),
          updatedBy: req.user.id,
        },
      });

      await audit(
        req,
        'update',
        'page',
        page.id,
        {
          slug: page.slug,
        }
      );

      res.json(page);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: 'Unable to update page',
      });
    }
  }
);
/*
|--------------------------------------------------------------------------
| Admin API - Dashboard Statistics
|--------------------------------------------------------------------------
*/

app.get(
  '/api/admin/stats',
  requireAuth,
  async (req, res) => {
    try {
      const [
        pages,
        news,
        media,
        videos,
        publications,
        officers,
        ranges,
      ] = await Promise.all([
        prisma.page.count(),
        prisma.news.count(),
        prisma.media.count(),
        prisma.video.count(),
        prisma.publication.count(),
        prisma.officer.count(),
        prisma.range.count(),
      ]);

      res.json({
        pages,
        news,
        media,
        videos,
        publications,
        officers,
        ranges,
      });
    } catch (error) {
      console.error(
        'Dashboard statistics error:',
        error
      );

      res.status(500).json({
        error: 'Unable to load dashboard statistics',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Public media
|--------------------------------------------------------------------------
*/

app.get('/api/public/media', async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(media);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Unable to load media',
    });
  }
});

/*
|--------------------------------------------------------------------------
| Public news
|--------------------------------------------------------------------------
*/

app.get('/api/public/news', async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    res.json(news);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Unable to load news',
    });
  }
});

/*
|--------------------------------------------------------------------------
| Legacy Public Assets
|--------------------------------------------------------------------------
|
| These are deliberately served unchanged.
|
*/

app.use(
  '/assets',
  express.static(LEGACY_ASSETS, {
    index: false,
    maxAge: '1h',
  })
);

app.use(
  '/legacy-assets',
  express.static(LEGACY_ASSETS, {
    index: false,
    maxAge: '1h',
  })
);

/*
|--------------------------------------------------------------------------
| Legacy Public Files
|--------------------------------------------------------------------------
*/

app.use(
  '/legacy-pages',
  express.static(LEGACY_PAGES, {
    index: false,
  })
);

/*
|--------------------------------------------------------------------------
| Public HTML renderer
|--------------------------------------------------------------------------
|
| We preserve the original legacy HTML and only rewrite relative
| links so that navigation works from the Express public routes.
|
*/

const PUBLIC_PAGE_MAP = {
  home: path.join(LEGACY, 'index.html'),

  about: path.join(LEGACY_PAGES, 'about.html'),
  contact: path.join(LEGACY_PAGES, 'contact.html'),
  divisions: path.join(LEGACY_PAGES, 'divisions.html'),
  ecotourism: path.join(LEGACY_PAGES, 'ecotourism.html'),
  forest: path.join(LEGACY_PAGES, 'forest.html'),
  gallery: path.join(LEGACY_PAGES, 'gallery.html'),
  grievance: path.join(LEGACY_PAGES, 'grievance.html'),
  media: path.join(LEGACY_PAGES, 'media.html'),
  news: path.join(LEGACY_PAGES, 'news.html'),
  notifications: path.join(
    LEGACY_PAGES,
    'notifications.html'
  ),
  rti: path.join(LEGACY_PAGES, 'rti.html'),
  schemes: path.join(LEGACY_PAGES, 'schemes.html'),
  search: path.join(LEGACY_PAGES, 'search.html'),
  tenders: path.join(LEGACY_PAGES, 'tenders.html'),
  wildlife: path.join(LEGACY_PAGES, 'wildlife.html'),
};

function rewriteLegacyLinks(html, slug) {
  let output = html;

  /*
   * Assets
   *
   * index.html:
   * assets/style.css
   *
   * pages/*.html:
   * ../assets/style.css
   *
   * Both become:
   * /assets/...
   */

  output = output.replace(
    /(?:\.\.\/)*assets\//gi,
    '/assets/'
  );

  /*
   * Home links
   */

  output = output.replace(
    /href=(["'])(?:\.\.\/)?index\.html\1/gi,
    'href="/"'
  );

  /*
   * Links from index.html:
   *
   * pages/about.html
   */

  output = output.replace(
    /href=(["'])pages\/([a-zA-Z0-9_-]+)\.html\1/gi,
    (match, quote, page) => {
      return `href=${quote}/${page}${quote}`;
    }
  );

  /*
   * Links from pages/*.html:
   *
   * about.html
   * ../index.html
   */

  output = output.replace(
    /href=(["'])(?:\.\.\/)?([a-zA-Z0-9_-]+)\.html\1/gi,
    (match, quote, page) => {
      if (page === 'index') {
        return `href=${quote}/${quote}`;
      }

      return `href=${quote}/${page}${quote}`;
    }
  );

  /*
   * JS navigation references
   */

  output = output.replace(
    /(?:\.\.\/)+assets\//gi,
    '/assets/'
  );

  /*
   * Preserve external links.
   */

  return output;
}

function injectPublicPageMetadata(html, slug) {
  const titles = {
    home: 'Forest & Wildlife Division | Sundergarh',
    about: 'About Us | Forest & Wildlife Division, Sundergarh',
    contact: 'Contact Us | Forest & Wildlife Division, Sundergarh',
    divisions:
      'Divisions & Ranges | Forest & Wildlife Division, Sundergarh',
    ecotourism:
      'Eco-Tourism | Forest & Wildlife Division, Sundergarh',
    forest:
      'Forests | Forest & Wildlife Division, Sundergarh',
    gallery:
      'Gallery | Forest & Wildlife Division, Sundergarh',
    grievance:
      'Grievance | Forest & Wildlife Division, Sundergarh',
    media:
      'Media | Forest & Wildlife Division, Sundergarh',
    news:
      'News | Forest & Wildlife Division, Sundergarh',
    notifications:
      'Notifications | Forest & Wildlife Division, Sundergarh',
    rti:
      'RTI | Forest & Wildlife Division, Sundergarh',
    schemes:
      'Schemes & Initiatives | Forest & Wildlife Division, Sundergarh',
    search:
      'Search | Forest & Wildlife Division, Sundergarh',
    tenders:
      'Tenders | Forest & Wildlife Division, Sundergarh',
    wildlife:
      'Wildlife | Forest & Wildlife Division, Sundergarh',
  };

  const title = titles[slug] || titles.home;

  if (/<title>.*?<\/title>/i.test(html)) {
    return html.replace(
      /<title>.*?<\/title>/i,
      `<title>${title}</title>`
    );
  }

  return html.replace(
    /<head>/i,
    `<head><title>${title}</title>`
  );
}

/*
|--------------------------------------------------------------------------
| Load legacy HTML
|--------------------------------------------------------------------------
*/

function loadLegacyPage(slug) {
  const file = PUBLIC_PAGE_MAP[slug];

  if (!file) {
    return null;
  }

  if (!fs.existsSync(file)) {
    console.error(
      `Legacy page file missing for "${slug}": ${file}`
    );

    return null;
  }

  return fs.readFileSync(file, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Public Website Routes
|--------------------------------------------------------------------------
*/

/*
 * Homepage
 */

app.get('/', async (req, res, next) => {
  try {
    const html = loadLegacyPage('home');

    if (!html) {
      return res.status(404).send(
        'Public homepage not found.'
      );
    }

    let output = rewriteLegacyLinks(
      html,
      'home'
    );

    output = injectPublicPageMetadata(
      output,
      'home'
    );

    res.type('html').send(output);
  } catch (error) {
    next(error);
  }
});

/*
 * /site/home
 *
 * Kept as a compatibility route.
 */

app.get('/site/home', async (req, res, next) => {
  try {
    const html = loadLegacyPage('home');

    if (!html) {
      return res.status(404).send(
        'Public homepage not found.'
      );
    }

    let output = rewriteLegacyLinks(
      html,
      'home'
    );

    output = injectPublicPageMetadata(
      output,
      'home'
    );

    res.type('html').send(output);
  } catch (error) {
    next(error);
  }
});

/*
 * Other public pages
 */

app.get(
  [
    '/about',
    '/contact',
    '/divisions',
    '/ecotourism',
    '/forest',
    '/gallery',
    '/grievance',
    '/media',
    '/news',
    '/notifications',
    '/rti',
    '/schemes',
    '/search',
    '/tenders',
    '/wildlife',
  ],
  async (req, res, next) => {
    try {
      const slug = req.path
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');

      const html = loadLegacyPage(slug);

      if (!html) {
        return res.status(404).send(
          'Public page not found.'
        );
      }

      let output = rewriteLegacyLinks(
        html,
        slug
      );

      output = injectPublicPageMetadata(
        output,
        slug
      );

      res.type('html').send(output);
    } catch (error) {
      next(error);
    }
  }
);

/*
 * /site/:slug compatibility route
 */

app.get('/site/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (!PUBLIC_PAGE_MAP[slug]) {
      return res.status(404).send(
        'Public page not found.'
      );
    }

    const html = loadLegacyPage(slug);

    if (!html) {
      return res.status(404).send(
        'Public page not found.'
      );
    }

    let output = rewriteLegacyLinks(
      html,
      slug
    );

    output = injectPublicPageMetadata(
      output,
      slug
    );

    res.type('html').send(output);
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| Error handling
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      error: 'Internal server error',
    });
  }

  res.status(500).send(
    'Internal server error'
  );
});

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

async function start() {
  try {
    await prisma.$connect();

    console.log(
      'PostgreSQL connected successfully'
    );

    app.listen(PORT, () => {
      console.log(
        `CMS API listening on ${PORT}`
      );

      console.log(
        `Public website: http://localhost:${PORT}/`
      );

      console.log(
        `Admin API: http://localhost:${PORT}/api`
      );
    });
  } catch (error) {
    console.error(
      'Unable to start server:',
      error
    );

    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();