import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  createRoot
} from 'react-dom/client';

import axios from 'axios';

import './style.css';


/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

const ORIGIN = API.replace(/\/api\/?$/, '');

const PUBLIC_SITE = ORIGIN;

const api = axios.create({
  baseURL: API,
  withCredentials: true
});


/* =========================================================
   CSRF
   ========================================================= */

async function csrf() {
  const response = await api.get('/auth/csrf');
  return response.data.csrfToken;
}


async function mutate(method, url, data) {
  const token = await csrf();

  return api({
    method,
    url,
    data,
    headers: {
      'x-csrf-token': token
    }
  });
}


/* =========================================================
   LOGIN
   ========================================================= */

function Login({onLogin}) {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err,setErr] = useState('');
  const [loading,setLoading] = useState(false);

  async function go(e) {
  e.preventDefault();
  setErr('');

  try {
    const csrfToken = await csrf();

    const r = await api.post(
      '/auth/login',
      {
        email,
        password
      },
      {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      }
    );

    onLogin(r.data.user);
  } catch (e) {
    setErr(e.response?.data?.error || 'Login failed');
  }
}

  return (
    <div className="login">
      <div className="login-card">
        <div className="leaf">🌿</div>

        <h1>Sundergarh CMS</h1>

        <p>
          Forest & Wildlife Division · Government of Odisha
        </p>

        <form onSubmit={go}>

          <input
            placeholder="Administrator email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            minLength="12"
          />

          {err && (
            <div className="error">
              {err}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Secure Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR MENU
   ========================================================= */

const items = [
  ['Dashboard', 'dashboard'],
  ['Pages', 'pages'],
  ['News', 'news'],
  ['Media Library', 'media'],
  ['Videos', 'videos'],
  ['Publications', 'publications'],
  ['Officers', 'officers'],
  ['Ranges', 'ranges'],
  ['Audit Log', 'audit']
];


/* =========================================================
   PUBLIC SITE URL
   ========================================================= */

function openPublicSite(slug = '') {

  const cleanSlug =
    String(slug || '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

  const url =
    cleanSlug && cleanSlug !== 'home'
      ? `${PUBLIC_SITE}/${cleanSlug}`
      : `${PUBLIC_SITE}/`;

  window.open(
    url,
    '_blank',
    'noopener,noreferrer'
  );
}


/* =========================================================
   MAIN CMS APPLICATION
   ========================================================= */

function App() {

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] =
    useState(true);


  /* ---------------------------------------------------------
     CHECK EXISTING LOGIN
     --------------------------------------------------------- */

  useEffect(() => {

    let mounted = true;

    api
      .get('/auth/me')
      .then((response) => {

        if (mounted) {
          setUser(response.data.user);
        }

      })
      .catch(() => {

        if (mounted) {
          setUser(null);
        }

      })
      .finally(() => {

        if (mounted) {
          setCheckingAuth(false);
        }

      });


    return () => {
      mounted = false;
    };

  }, []);


  /* ---------------------------------------------------------
     LOADING
     --------------------------------------------------------- */

  if (checkingAuth) {

    return (
      <div className="login">
        <div className="login-card">
          <div className="leaf">
            🌿
          </div>

          <h1>
            Sundergarh CMS
          </h1>

          <p>
            Checking secure session…
          </p>
        </div>
      </div>
    );

  }


  /* ---------------------------------------------------------
     LOGIN
     --------------------------------------------------------- */

  if (!user) {

    return (
      <Login
        onLogin={setUser}
      />
    );

  }


  /* ---------------------------------------------------------
     CURRENT TAB
     --------------------------------------------------------- */

  const currentItem =
    items.find(
      (item) => item[1] === tab
    );


  /* ---------------------------------------------------------
     LOGOUT
     --------------------------------------------------------- */

  async function logout() {

    try {

      await mutate(
        'post',
        '/auth/logout',
        {}
      );

    } catch (error) {

      console.error(
        'Logout error:',
        error
      );

    } finally {

      setUser(null);
      setTab('dashboard');

    }
  }


  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside>

        <div className="brand">

          <span className="brand-icon">
            🌿
          </span>

          <span>
            Sundergarh
            <br />

            <small>
              Forest CMS
            </small>
          </span>

        </div>


        {/* MENU */}

        {items.map((item) => (

          <button
            key={item[1]}
            className={
              tab === item[1]
                ? 'active'
                : ''
            }
            onClick={() =>
              setTab(item[1])
            }
          >
            {item[0]}
          </button>

        ))}


        {/* PUBLIC WEBSITE */}

        <button
          className="public"
          onClick={() =>
            openPublicSite()
          }
        >
          View Public Site ↗
        </button>


        {/* LOGOUT */}

        <button
          className="logout"
          onClick={logout}
        >
          Sign Out
        </button>

      </aside>


      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <main>

        <header>

          <div>

            <span className="eyebrow">
              ADMINISTRATION
            </span>

            <h2>
              {currentItem?.[0] ||
                'Dashboard'}
            </h2>

          </div>


          <div className="user">

            <span>
              {user.name}
            </span>

            <small>
              {String(user.role || '')
                .replaceAll('_', ' ')}
            </small>

          </div>

        </header>


        <Content
          tab={tab}
        />

      </main>

    </div>
  );
}


/* =========================================================
   CONTENT ROUTER
   ========================================================= */

function Content({ tab }) {

  if (tab === 'dashboard') {
    return <Dashboard />;
  }


  if (tab === 'pages') {
    return <PageManager />;
  }


  if (tab === 'media') {

    return (
      <CrudManager
        type="media"
        title="Media Library"
        fields={[]}
      />
    );

  }


  if (tab === 'news') {

    return (
      <CrudManager
        type="news"
        title="News"
        fields={[
          'title',
          'slug',
          'summary',
          'publishDate',
          'status',
          'featuredImageId'
        ]}
      />
    );

  }


  if (tab === 'videos') {

    return (
      <CrudManager
        type="videos"
        title="Videos"
        fields={[
          'title',
          'description',
          'youtubeUrl',
          'category',
          'status',
          'thumbnailMediaId'
        ]}
      />
    );

  }


  if (tab === 'publications') {

    return (
      <CrudManager
        type="publications"
        title="Publications"
        fields={[
          'title',
          'description',
          'category',
          'publishDate',
          'status',
          'documentMediaId',
          'coverMediaId'
        ]}
      />
    );

  }


  if (tab === 'officers') {

    return (
      <CrudManager
        type="officers"
        title="Officers"
        fields={[
          'name',
          'designation',
          'office',
          'mobile',
          'officePhone',
          'email',
          'sortOrder',
          'status',
          'photoMediaId'
        ]}
      />
    );

  }


  if (tab === 'ranges') {

    return (
      <CrudManager
        type="ranges"
        title="Ranges"
        fields={[
          'name',
          'officerName',
          'mobile',
          'phone',
          'email',
          'description',
          'sortOrder',
          'status',
          'photoMediaId'
        ]}
      />
    );

  }


  if (tab === 'audit') {
    return <Audit />;
  }


  return <Dashboard />;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard() {

  const [data, setData] =
    useState(null);

  const [error, setError] =
    useState('');


  useEffect(() => {

    api
      .get('/admin/stats')
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {

        console.error(error);

        setError(
          error.response?.data?.error ||
          'Unable to load dashboard statistics.'
        );

      });

  }, []);


  const stats = [
    'pages',
    'news',
    'media',
    'videos',
    'publications',
    'officers',
    'ranges'
  ];


  return (
    <section className="cards">

      {stats.map((key) => (

        <div
          className="stat"
          key={key}
        >

          <small>
            {key}
          </small>

          <strong>
            {data?.[key] ?? '—'}
          </strong>

          <span>
            Database records
          </span>

        </div>

      ))}


      {error && (
        <div className="error">
          {error}
        </div>
      )}


      <div className="welcome">

        <h3>
          Sundergarh Forest & Wildlife
          CMS
        </h3>

        <p>
          Manage the public website,
          pages, news, media, videos,
          publications, officers and
          ranges from this administration
          panel.
        </p>

        <p>
          Public pages are served directly
          from the Node.js server and use
          the original files from
          <strong> legacy-public </strong>
          for the public website design.
        </p>

        <button
          onClick={() =>
            openPublicSite()
          }
        >
          Open Public Website ↗
        </button>

      </div>

    </section>
  );
}


/* =========================================================
   PAGE MANAGER
   ========================================================= */

function PageManager() {

  const [data, setData] =
    useState([]);

  const [edit, setEdit] =
    useState(null);

  const [newPage, setNewPage] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');


  async function load() {

    setLoading(true);
    setError('');

    try {

      const response =
        await api.get('/admin/pages');

      setData(
        Array.isArray(response.data)
          ? response.data
          : []
      );

    } catch (error) {

      console.error(error);

      setError(
        error.response?.data?.error ||
        'Unable to load pages.'
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    load();
  }, []);


  return (
    <div className="panel">

      <div className="toolbar">

        <div>

          <h3>
            Public Pages
          </h3>

          <p>
            Existing public portal pages
            are imported and editable here.
          </p>

        </div>


        <button
          onClick={() =>
            setNewPage(true)
          }
        >
          + New Page
        </button>

      </div>


      {error && (
        <div className="error">
          {error}
        </div>
      )}


      {loading ? (

        <div className="empty">
          Loading pages…
        </div>

      ) : (

        <table>

          <thead>

            <tr>
              <th>Page</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>

          </thead>


          <tbody>

            {data.map((page) => (

              <tr key={page.id}>

                <td>
                  <b>
                    {page.title}
                  </b>
                </td>

                <td>
                  {page.slug}
                </td>

                <td>

                  <span
                    className={
                      'badge ' +
                      String(
                        page.status || ''
                      ).toLowerCase()
                    }
                  >
                    {page.status}
                  </span>

                </td>

                <td>
                  {page.updatedAt
                    ? new Date(
                        page.updatedAt
                      ).toLocaleString()
                    : '—'}
                </td>

                <td>

                  <button
                    className="small"
                    onClick={() =>
                      setEdit(page)
                    }
                  >
                    Edit
                  </button>

                  {' '}

                  <button
                    className="small"
                    onClick={() =>
                      openPublicSite(
                        page.slug
                      )
                    }
                  >
                    View
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}


      {edit && (

        <PageEdit
          page={edit}
          close={() => {
            setEdit(null);
            load();
          }}
        />

      )}


      {newPage && (

        <PageEdit
          create
          page={{
            slug: 'new-page',
            title: 'New Page',
            menuLabel: 'New Page',
            metaDescription: '',
            heroImage: '',
            bodyHtml:
              '<main id="main-content">' +
              '<section class="container">' +
              '<h1>New Page</h1>' +
              '<p>Start editing this page.</p>' +
              '</section>' +
              '</main>',
            status: 'DRAFT',
            sortOrder: data.length
          }}
          close={() => {
            setNewPage(false);
            load();
          }}
        />

      )}

    </div>
  );
}


/* =========================================================
   PAGE EDITOR
   ========================================================= */

function PageEdit({
  page,
  close,
  create = false
}) {

  const [p, setP] =
    useState({
      ...page
    });

  const [saving, setSaving] =
    useState(false);


  function update(field, value) {

    setP((previous) => ({
      ...previous,
      [field]: value
    }));

  }


  async function save() {

    setSaving(true);

    try {

      if (create) {

        await mutate(
          'post',
          '/admin/pages',
          p
        );

      } else {

        await mutate(
          'put',
          '/admin/pages/' + p.id,
          p
        );

      }

      close();

    } catch (error) {

      alert(
        error.response?.data?.error ||
        'Save failed'
      );

    } finally {

      setSaving(false);

    }
  }


  return (
    <div className="modal">

      <div className="modal-card wide">

        <h3>
          {create
            ? 'Create Page'
            : 'Edit: ' + page.title}
        </h3>


        <div className="form-grid">

          <label>

            Title

            <input
              value={p.title || ''}
              onChange={(e) =>
                update(
                  'title',
                  e.target.value
                )
              }
            />

          </label>


          <label>

            Menu Label

            <input
              value={p.menuLabel || ''}
              onChange={(e) =>
                update(
                  'menuLabel',
                  e.target.value
                )
              }
            />

          </label>


          {create && (

            <label>

              Slug

              <input
                value={p.slug || ''}
                onChange={(e) =>
                  update(
                    'slug',
                    e.target.value
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        '-'
                      )
                  )
                }
              />

            </label>

          )}


          <label>

            Status

            <select
              value={
                p.status || 'DRAFT'
              }
              onChange={(e) =>
                update(
                  'status',
                  e.target.value
                )
              }
            >
              <option value="DRAFT">
                DRAFT
              </option>

              <option value="PUBLISHED">
                PUBLISHED
              </option>

              <option value="ARCHIVED">
                ARCHIVED
              </option>

            </select>

          </label>

        </div>


        <label>

          Meta Description

          <input
            value={
              p.metaDescription || ''
            }
            onChange={(e) =>
              update(
                'metaDescription',
                e.target.value
              )
            }
          />

        </label>


        <label>

          Hero Image URL

          <input
            value={p.heroImage || ''}
            onChange={(e) =>
              update(
                'heroImage',
                e.target.value
              )
            }
          />

        </label>


        <label>

          Public Page HTML

          <textarea
            rows="22"
            value={
              p.bodyHtml || ''
            }
            onChange={(e) =>
              update(
                'bodyHtml',
                e.target.value
              )
            }
          />

        </label>


        <div className="actions">

          <button
            onClick={save}
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : 'Save'}
          </button>

          <button
            className="ghost"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   GENERIC CRUD MANAGER
   ========================================================= */

function CrudManager({
  type,
  title,
  fields
}) {

  const [data, setData] =
    useState([]);

  const [edit, setEdit] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  async function load() {

    setLoading(true);

    try {

      const response =
        await api.get(
          '/admin/' + type
        );

      setData(
        Array.isArray(response.data)
          ? response.data
          : []
      );

    } catch (error) {

      console.error(
        'Unable to load',
        type,
        error
      );

      setData([]);

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    load();
  }, [type]);


  const empty = useMemo(
    () =>
      Object.fromEntries(
        fields.map((field) => {

          if (field === 'status') {
            return [field, 'DRAFT'];
          }

          if (field === 'sortOrder') {
            return [field, 0];
          }

          return [field, ''];

        })
      ),
    [fields]
  );


  async function remove(id) {

    if (
      !window.confirm(
        'Delete this record?'
      )
    ) {
      return;
    }


    try {

      await mutate(
        'delete',
        '/admin/' +
          type +
          '/' +
          id
      );

      await load();

    } catch (error) {

      alert(
        error.response?.data?.error ||
        'Delete failed'
      );

    }
  }


  return (
    <div className="panel">

      <div className="toolbar">

        <div>

          <h3>
            {title}
          </h3>

          <p>
            Database-backed CRUD
            management.
          </p>

        </div>


        {fields.length > 0 && (

          <button
            onClick={() =>
              setEdit(empty)
            }
          >
            + Add
          </button>

        )}

      </div>


      {loading ? (

        <div className="empty">
          Loading {title}…
        </div>

      ) : fields.length === 0 ? (

        <MediaTable
          data={data}
          load={load}
        />

      ) : (

        <table>

          <thead>

            <tr>

              {fields
                .slice(0, 5)
                .map((field) => (

                  <th key={field}>
                    {formatFieldName(
                      field
                    )}
                  </th>

                ))}

              <th>
                Actions
              </th>

            </tr>

          </thead>


          <tbody>

            {data.map((record) => (

              <tr key={record.id}>

                {fields
                  .slice(0, 5)
                  .map((field) => (

                    <td key={field}>

                      {formatCellValue(
                        record[field]
                      )}

                    </td>

                  ))}


                <td>

                  <button
                    className="small"
                    onClick={() =>
                      setEdit(record)
                    }
                  >
                    Edit
                  </button>

                  {' '}

                  <button
                    className="small danger"
                    onClick={() =>
                      remove(
                        record.id
                      )
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}


      {edit && (

        <RecordEdit
          type={type}
          record={edit}
          fields={fields}
          close={() => {
            setEdit(null);
            load();
          }}
        />

      )}

    </div>
  );
}


/* =========================================================
   FIELD NAME FORMATTER
   ========================================================= */

function formatFieldName(field) {

  return String(field)
    .replace(
      /([A-Z])/g,
      ' $1'
    )
    .replace(
      /^./,
      (character) =>
        character.toUpperCase()
    );
}


/* =========================================================
   CELL FORMATTER
   ========================================================= */

function formatCellValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }


  if (
    typeof value === 'object'
  ) {
    return JSON.stringify(value);
  }


  return String(value)
    .slice(0, 100);
}


/* =========================================================
   RECORD EDIT
   ========================================================= */

function RecordEdit({
  type,
  record,
  fields,
  close
}) {

  const [r, setR] =
    useState({
      ...record
    });

  const [saving, setSaving] =
    useState(false);


  function update(field, value) {

    setR((previous) => ({
      ...previous,
      [field]: value
    }));

  }


  async function save() {

    setSaving(true);

    try {

      const data = {
        ...r
      };


      if (
        data.publishDate === ''
      ) {
        data.publishDate = null;
      }


      if (
        data.sortOrder !== undefined &&
        data.sortOrder !== ''
      ) {
        data.sortOrder =
          Number(
            data.sortOrder
          );
      }


      if (record.id) {

        await mutate(
          'put',
          '/admin/' +
            type +
            '/' +
            record.id,
          data
        );

      } else {

        await mutate(
          'post',
          '/admin/' +
            type,
          data
        );

      }


      close();

    } catch (error) {

      alert(
        error.response?.data?.error ||
        'Save failed'
      );

    } finally {

      setSaving(false);

    }
  }


  return (
    <div className="modal">

      <div className="modal-card wide">

        <h3>
          {record.id
            ? 'Edit '
            : 'Create '}
          {formatFieldName(type)}
        </h3>


        {fields.map((field) => (

          <label key={field}>

            {formatFieldName(
              field
            )}


            {field === 'status' ? (

              <select
                value={
                  r[field] ||
                  'DRAFT'
                }
                onChange={(e) =>
                  update(
                    field,
                    e.target.value
                  )
                }
              >

                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="PUBLISHED">
                  PUBLISHED
                </option>

                <option value="ARCHIVED">
                  ARCHIVED
                </option>

              </select>

            ) : field ===
              'description' ||
              field ===
              'summary' ? (

              <textarea
                rows="5"
                value={
                  r[field] ?? ''
                }
                onChange={(e) =>
                  update(
                    field,
                    e.target.value
                  )
                }
              />

            ) : (

              <input
                type={
                  field ===
                  'publishDate'
                    ? 'date'
                    : 'text'
                }
                value={
                  r[field] ?? ''
                }
                onChange={(e) =>
                  update(
                    field,
                    field ===
                      'sortOrder'
                      ? Number(
                          e.target.value
                        )
                      : e.target.value
                  )
                }
              />

            )}

          </label>

        ))}


        <div className="actions">

          <button
            onClick={save}
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : 'Save'}
          </button>

          <button
            className="ghost"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MEDIA LIBRARY
   ========================================================= */

function MediaTable({
  data,
  load
}) {

  const [file, setFile] =
    useState(null);

  const [title, setTitle] =
    useState('');

  const [uploading, setUploading] =
    useState(false);


  async function upload() {

    if (!file) {

      alert(
        'Please select a file.'
      );

      return;
    }


    setUploading(true);


    try {

      const token =
        await csrf();

      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      formData.append(
        'title',
        title
      );


      await api.post(
        '/admin/media/upload',
        formData,
        {
          headers: {
            'x-csrf-token':
              token
          }
        }
      );


      setFile(null);
      setTitle('');

      await load();


    } catch (error) {

      alert(
        error.response?.data?.error ||
        'Upload failed'
      );

    } finally {

      setUploading(false);

    }
  }


  return (
    <>
      <div className="upload">

        <input
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
          placeholder="Media title"
        />


        <input
          type="file"
          onChange={(e) =>
            setFile(
              e.target.files?.[0] ||
              null
            )
          }
        />


        <button
          onClick={upload}
          disabled={uploading}
        >
          {uploading
            ? 'Uploading…'
            : 'Upload'}
        </button>

      </div>


      <div className="media-grid">

        {data.map((media) => (

          <div
            className="media"
            key={media.id}
          >

            {media.type ===
            'IMAGE' ? (

              <img
                src={
                  media.storagePath
                    ?.startsWith(
                      'http'
                    )
                    ? media.storagePath
                    : ORIGIN +
                      (
                        media.storagePath ||
                        ''
                      )
                }
                alt={
                  media.title ||
                  'Media'
                }
              />

            ) : (

              <div className="file">
                {media.type ||
                  'FILE'}
              </div>

            )}


            <b>
              {media.title ||
                'Untitled'}
            </b>

            <small>
              {media.category ||
                'Uncategorised'}
            </small>

          </div>

        ))}

      </div>

    </>
  );
}


/* =========================================================
   AUDIT LOG
   ========================================================= */

function Audit() {

  const [data, setData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    api
      .get('/admin/audit')
      .then((response) => {

        setData(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );

      })
      .catch((error) => {

        console.error(
          'Audit load failed:',
          error
        );

      })
      .finally(() => {

        setLoading(false);

      });

  }, []);


  return (
    <div className="panel">

      <h3>
        Audit Log
      </h3>


      {loading ? (

        <div className="empty">
          Loading audit log…
        </div>

      ) : (

        <table>

          <thead>

            <tr>

              <th>
                Time
              </th>

              <th>
                User
              </th>

              <th>
                Action
              </th>

              <th>
                Entity
              </th>

              <th>
                IP
              </th>

            </tr>

          </thead>


          <tbody>

            {data.map((item) => (

              <tr key={item.id}>

                <td>
                  {item.createdAt
                    ? new Date(
                        item.createdAt
                      ).toLocaleString()
                    : '—'}
                </td>


                <td>
                  {item.user?.email ||
                    '—'}
                </td>


                <td>
                  {item.action ||
                    '—'}
                </td>


                <td>

                  {item.entityType ||
                    '—'}

                  {' '}

                  {item.entityId ||
                    ''}

                </td>


                <td>
                  {item.ip ||
                    '—'}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>
  );
}


/* =========================================================
   ROOT
   =========================================================

   IMPORTANT:
   No BrowserRouter.
   No /site redirect.
   No iframe.
   No /public-site route.

   The React application is ONLY the CMS.

   The Express server is responsible for
   serving the real legacy-public website.
   ========================================================= */

function Root() {

  return <App />;

}


/* =========================================================
   START REACT
   ========================================================= */

createRoot(
  document.getElementById('root')
).render(
  <Root />
);