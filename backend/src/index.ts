import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import postgres from "@fastify/postgres";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Пропущены обязательные переменные окружения: ${envVar}`);
  }
}

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
  requestIdLogLabel: "reqId",
  disableRequestLogging: false,
});

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  cache: 10000,
  whitelist: ["127.0.0.1"],
  redis: undefined,
  skipOnError: false,
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    algorithm: "HS256",
  },
  verify: {
    algorithms: ["HS256"],
  },
});

await app.register(postgres, {
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

app.addHook("onReady", async () => {
  try {
    const client = await app.pg.connect();
    await client.query("SELECT NOW()");
    client.release();
    app.log.info("✅ PostgreSQL соединение успешно установлено");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`❌ Не удалось подключиться к PostgreSQL: ${errorMessage}`);
    throw error;
  }
});

app.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", async (_request, reply) => {
  try {
    const client = await app.pg.connect();
    await client.query("SELECT 1");
    client.release();
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime(),
    };
  } catch (error) {
    reply.code(503);
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: "Database connection failed",
    };
  }
});

app.get(
  "/api/protected",
  { preHandler: [app.authenticate] },
  async (request, _reply) => {
    return {
      message: "This is a protected route",
      user: request.user,
    };
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post<{
  Body: { email: string; password: string };
}>("/api/login", async (request, reply) => {
  const { email, password } = request.body;

  try {
    const client = await app.pg.connect();
    const result = await client.query(
      "SELECT id, password_hash, role, first_name, last_name FROM dc_new.users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      client.release();
      reply.code(401).send({ error: "Аккаунта не существует" });
      return;
    }

    const { id, password_hash, role, first_name, last_name } = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, password_hash);
    if (!isPasswordValid) {
      client.release();
      reply.code(401).send({ error: "Неверные данные входа" });
      return;
    }

    let questionnaireCompleted: boolean | null = null;
    if (role === "student") {
      const profileResult = await client.query(
        "SELECT questionnaire_completed FROM dc_new.student_profiles WHERE user_id = $1",
        [id]
      );
      questionnaireCompleted = profileResult.rows[0]?.questionnaire_completed ?? false;
    }
    client.release();

    const token = app.jwt.sign({ id, email, role });
    return {
      token,
      user: { id, email, role, firstName: first_name, lastName: last_name, questionnaireCompleted },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`Login error: ${errorMessage}`);
    reply.code(500).send({ error: "Внутренняя ошибка сервера" });
  }
});

app.post<{
  Body: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    role: "student" | "teacher";
    adminPassword?: string;
  };
}>("/api/register", async (request, reply) => {
  const { email, password, firstName = "", lastName = "", middleName, role, adminPassword } = request.body;

  if (!email || !password || !role) {
    return reply.code(400).send({ error: "Email, пароль и роль обязательны" });
  }

  if (role === "teacher" && (!firstName.trim() || !lastName.trim())) {
    return reply.code(400).send({ error: "Для данной роли необходимо указать имя и фамилию" });
  }

  if (!["student", "teacher"].includes(role)) {
    return reply.code(400).send({ error: "Некорректная роль" });
  }

  if (role === "teacher") {
    const staffSecret = process.env.STAFF_SECRET;
    if (!staffSecret || adminPassword !== staffSecret) {
      return reply.code(403).send({ error: "Неверный пароль доступа" });
    }
  }

  const client = await app.pg.connect();
  try {
    const existing = await client.query(
      "SELECT id FROM dc_new.users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return reply.code(409).send({ error: "Пользователь с таким email уже существует" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO dc_new.users (email, password_hash, first_name, last_name, middle_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [email, passwordHash, firstName, lastName, middleName ?? null, role]
    );

    const userId = result.rows[0].id;

    if (role === "student") {
      await client.query(
        "INSERT INTO dc_new.student_profiles (user_id) VALUES ($1)",
        [userId]
      );
    }

    const token = app.jwt.sign({ id: userId, email, role });
    return reply.code(201).send({
      token,
      user: { id: userId, email, role, firstName, lastName },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`Register error: ${errorMessage}`);
    reply.code(500).send({ error: "Внутренняя ошибка сервера" });
  } finally {
    client.release();
  }
});

app.post(
  "/api/logout",
  { preHandler: [app.authenticate] },
  async (request, _reply) => {
    const user = request.user as { email?: string };
    app.log.info(`User logged out: ${user.email || "unknown"}`);
    return { message: "Logged out successfully" };
  }
);

// ─── Account (self-service, both roles) ──────────────────────────────────────

// GET /api/account/profile — the current user's own profile (role-aware)
app.get(
  "/api/account/profile",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const authUser = request.user as { id: number; role: string };

    const client = await app.pg.connect();
    try {
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, middle_name, role
         FROM dc_new.users WHERE id = $1`,
        [authUser.id]
      );
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }
      const u = userResult.rows[0];

      const base = {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        middleName: u.middle_name,
        role: u.role,
      };

      if (u.role !== "student") {
        return base;
      }

      const profileResult = await client.query(
        `SELECT telegram, to_char(birthday, 'YYYY-MM-DD') AS birthday, citizenship, phone,
                edu_faculty, edu_program, study_year, debts, edu_rating,
                digital_literacy_score, python_score, data_analysis_score,
                motivation_text, achievements, prior_courses, experience,
                recommendation_available, recommendation_email, questionnaire_completed
         FROM dc_new.student_profiles WHERE user_id = $1`,
        [authUser.id]
      );
      const sp = profileResult.rows[0] ?? {};

      let experience: Record<string, Record<string, string>> = {};
      try { experience = JSON.parse(sp.experience ?? "{}"); } catch { /* malformed, ignore */ }

      const preferencesResult = await client.query(
        `SELECT spr.priority, spr.discipline_id, d.name AS discipline, spr.desired_group_size
         FROM dc_new.student_preferences spr
         JOIN dc_new.disciplines d ON d.id = spr.discipline_id
         WHERE spr.student_id = $1
         ORDER BY spr.priority`,
        [authUser.id]
      );

      const priorities = preferencesResult.rows.map((p: {
        priority: number;
        discipline_id: number;
        discipline: string;
        desired_group_size: number;
      }) => ({
        priority: p.priority,
        disciplineId: p.discipline_id,
        discipline: p.discipline,
        desiredGroupSize: p.desired_group_size,
        answers: experience[String(p.priority)] ?? {},
      }));

      return {
        ...base,
        questionnaireCompleted: sp.questionnaire_completed ?? false,
        telegram: sp.telegram ?? null,
        birthday: sp.birthday ?? null,
        citizenship: sp.citizenship ?? null,
        phone: sp.phone ?? null,
        eduFaculty: sp.edu_faculty ?? null,
        eduProgram: sp.edu_program ?? null,
        studyYear: sp.study_year ?? null,
        debts: sp.debts ?? null,
        eduRating: sp.edu_rating ?? null,
        digitalLiteracyScore: sp.digital_literacy_score ?? null,
        programmingScore: sp.python_score ?? null,
        dataAnalysisScore: sp.data_analysis_score ?? null,
        motivation: sp.motivation_text ?? null,
        achievements: sp.achievements ?? null,
        priorCourses: sp.prior_courses ?? null,
        recommendationAvailable: sp.recommendation_available ?? false,
        recommendationEmail: sp.recommendation_email ?? null,
        priorities,
      };
    } finally {
      client.release();
    }
  }
);

// PUT /api/account/credentials — update name, login (email) and/or password (both roles)
app.put<{
  Body: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    newPassword?: string;
  };
}>(
  "/api/account/credentials",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const authUser = request.user as { id: number; email: string; role: "student" | "teacher" };
    const { firstName, lastName, middleName, email, newPassword } = request.body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return reply.code(400).send({ error: "Имя, фамилия и логин обязательны" });
    }
    if (newPassword && newPassword.length < 6) {
      return reply.code(400).send({ error: "Новый пароль должен быть не короче 6 символов" });
    }

    const client = await app.pg.connect();
    try {
      const current = await client.query(
        `SELECT id FROM dc_new.users WHERE id = $1`,
        [authUser.id]
      );
      if (current.rows.length === 0) {
        return reply.code(404).send({ error: "Пользователь не найден" });
      }

      if (email !== authUser.email) {
        const existing = await client.query(
          `SELECT id FROM dc_new.users WHERE email = $1 AND id != $2`,
          [email, authUser.id]
        );
        if (existing.rows.length > 0) {
          return reply.code(409).send({ error: "Этот логин уже занят" });
        }
      }

      if (newPassword) {
        const newHash = await bcrypt.hash(newPassword, 10);
        await client.query(
          `UPDATE dc_new.users
           SET first_name = $1, last_name = $2, middle_name = $3, email = $4, password_hash = $5
           WHERE id = $6`,
          [firstName, lastName, middleName ?? null, email, newHash, authUser.id]
        );
      } else {
        await client.query(
          `UPDATE dc_new.users
           SET first_name = $1, last_name = $2, middle_name = $3, email = $4
           WHERE id = $5`,
          [firstName, lastName, middleName ?? null, email, authUser.id]
        );
      }

      let questionnaireCompleted: boolean | null = null;
      if (authUser.role === "student") {
        const q = await client.query(
          `SELECT questionnaire_completed FROM dc_new.student_profiles WHERE user_id = $1`,
          [authUser.id]
        );
        questionnaireCompleted = q.rows[0]?.questionnaire_completed ?? false;
      }

      const token = app.jwt.sign({ id: authUser.id, email, role: authUser.role });
      return {
        token,
        user: {
          id: authUser.id, email, role: authUser.role,
          firstName, lastName, middleName: middleName ?? null,
          questionnaireCompleted,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      app.log.error(`Account credentials update error: ${errorMessage}`);
      reply.code(500).send({ error: "Внутренняя ошибка сервера" });
    } finally {
      client.release();
    }
  }
);

// Faculty / program names are typed by hand, so the same value arrives as
// " ФКН", "ФКН  " or "фкн". Collapse whitespace and reuse the spelling that is
// already stored (case-insensitively) so every variant ends up as one value.
function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const nameKey = (value: string) => normalizeName(value).toLowerCase();

type QueryClient = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

interface EducationNames {
  faculties: string[];
  programs: { name: string; faculty: string }[];
  citizenships: string[];
}

// Faculty / program / citizenship names students have entered, one per name
// ignoring case and spaces (the spelling most students use wins). Programs are
// kept per faculty, so the form can suggest only the chosen faculty's programs.
// Deduplicated here rather than in SQL: lower() ignores Cyrillic under the C locale.
async function loadEducationNames(client: QueryClient): Promise<EducationNames> {
  const [result, citizenshipResult] = await Promise.all([
    client.query(
      `SELECT edu_faculty AS faculty, edu_program AS program, count(*)::int AS uses
       FROM dc_new.student_profiles
       WHERE btrim(coalesce(edu_faculty, '')) <> ''
       GROUP BY 1, 2`
    ),
    client.query(
      `SELECT citizenship, count(*)::int AS uses
       FROM dc_new.student_profiles
       WHERE btrim(coalesce(citizenship, '')) <> ''
       GROUP BY 1`
    ),
  ]);
  const rows = result.rows as { faculty: string; program: string | null; uses: number }[];
  const citizenshipRows = citizenshipResult.rows as { citizenship: string; uses: number }[];

  // For every name (by key) count how many students use each spelling of it
  const spellings = new Map<string, Map<string, number>>();
  const count = (key: string, spelling: string, uses: number) => {
    const byName = spellings.get(key) ?? new Map<string, number>();
    byName.set(spelling, (byName.get(spelling) ?? 0) + uses);
    spellings.set(key, byName);
  };
  const mostUsed = (key: string) =>
    [...spellings.get(key)!].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))[0]![0];

  for (const row of rows) {
    count(`f|${nameKey(row.faculty)}`, normalizeName(row.faculty), row.uses);
    if (row.program && normalizeName(row.program)) {
      count(`p|${nameKey(row.faculty)}|${nameKey(row.program)}`, normalizeName(row.program), row.uses);
    }
  }
  for (const row of citizenshipRows) {
    count(`c|${nameKey(row.citizenship)}`, normalizeName(row.citizenship), row.uses);
  }

  const faculties = new Map<string, string>();
  const programs = new Map<string, { name: string; faculty: string }>();
  for (const row of rows) {
    const faculty = mostUsed(`f|${nameKey(row.faculty)}`);
    faculties.set(nameKey(faculty), faculty);
    if (!row.program || !normalizeName(row.program)) continue;
    const key = `p|${nameKey(row.faculty)}|${nameKey(row.program)}`;
    programs.set(key, { name: mostUsed(key), faculty });
  }

  const citizenships = new Map<string, string>();
  for (const row of citizenshipRows) {
    const citizenship = mostUsed(`c|${nameKey(row.citizenship)}`);
    citizenships.set(nameKey(citizenship), citizenship);
  }

  const byName = (a: string, b: string) => a.localeCompare(b, "ru");
  return {
    faculties: [...faculties.values()].sort(byName),
    programs: [...programs.values()].sort((a, b) => byName(a.name, b.name)),
    citizenships: [...citizenships.values()].sort(byName),
  };
}

// Existing spelling of a faculty, or the typed one cleaned of extra spaces
function canonicalFaculty(names: EducationNames, value: string): string {
  return names.faculties.find((f) => nameKey(f) === nameKey(value)) ?? normalizeName(value);
}

// Existing spelling of a citizenship, or the typed one cleaned of extra spaces
function canonicalCitizenship(names: EducationNames, value: string): string {
  return names.citizenships.find((c) => nameKey(c) === nameKey(value)) ?? normalizeName(value);
}

// Existing spelling of a program within its faculty, or the typed one cleaned
function canonicalProgram(names: EducationNames, faculty: string, value: string): string {
  return names.programs.find(
    (p) => nameKey(p.faculty) === nameKey(faculty) && nameKey(p.name) === nameKey(value)
  )?.name ?? normalizeName(value);
}

// Bring names saved before normalization existed to their canonical spelling
async function normalizeStoredEducationNames(client: QueryClient): Promise<number> {
  const names = await loadEducationNames(client);
  const result = await client.query(
    `SELECT user_id, edu_faculty, edu_program, citizenship
     FROM dc_new.student_profiles
     WHERE edu_faculty IS NOT NULL OR edu_program IS NOT NULL OR citizenship IS NOT NULL`
  );
  let updated = 0;
  type Row = { user_id: number; edu_faculty: string | null; edu_program: string | null; citizenship: string | null };
  for (const row of result.rows as Row[]) {
    const faculty = row.edu_faculty === null ? null : canonicalFaculty(names, row.edu_faculty);
    const program = row.edu_program === null ? null
      : canonicalProgram(names, faculty ?? "", row.edu_program);
    const citizenship = row.citizenship === null ? null : canonicalCitizenship(names, row.citizenship);
    if (faculty === row.edu_faculty && program === row.edu_program && citizenship === row.citizenship) continue;
    await client.query(
      `UPDATE dc_new.student_profiles
       SET edu_faculty = $1, edu_program = $2, citizenship = $3
       WHERE user_id = $4`,
      [faculty, program, citizenship, row.user_id]
    );
    updated++;
  }
  return updated;
}

app.addHook("onReady", async () => {
  const client = await app.pg.connect();
  try {
    const updated = await normalizeStoredEducationNames(client);
    if (updated > 0) app.log.info(`Нормализованы факультет / программа / гражданство в ${updated} анкетах`);
  } catch (error) {
    // Not critical for serving requests: suggestions and new saves normalize anyway
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.warn(`Не удалось нормализовать факультеты / программы / гражданство: ${errorMessage}`);
  } finally {
    client.release();
  }
});

// GET /api/disciplines — list all disciplines
app.get(
  "/api/disciplines",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT id, name FROM dc_new.disciplines ORDER BY name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/faculties — list all faculties
app.get(
  "/api/faculties",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT id, name FROM dc_new.faculties ORDER BY name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/programs — list all programs with faculty name
app.get(
  "/api/programs",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT p.id, p.name, f.name AS faculty_name
         FROM dc_new.programs p
         JOIN dc_new.faculties f ON f.id = p.faculty_id
         ORDER BY f.name, p.name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/education-options — unique faculty / program / citizenship names
// students have entered, for the form suggestions
app.get(
  "/api/education-options",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      return await loadEducationNames(client);
    } finally {
      client.release();
    }
  }
);

// GET /api/modules — list all modules
app.get(
  "/api/modules",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT id, number FROM dc_new.modules ORDER BY number`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// ─── Student endpoints ────────────────────────────────────────────────────────

// GET /api/student/my-groups — active bookings for the current student
app.get(
  "/api/student/my-groups",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           b.id,
           b.num_groups,
           d.name  AS discipline,
           p.name  AS program,
           f.name  AS faculty,
           b.payment_type,
           u.first_name,
           u.last_name,
           u.email AS teacher_email,
           COALESCE((
             SELECT array_agg(m.number ORDER BY m.number)
             FROM dc_new.course_offer_modules com
             JOIN dc_new.modules m ON com.module_id = m.id
             WHERE com.offer_id = co.id
           ), ARRAY[]::int[]) AS modules,
           COALESCE((
             SELECT json_agg(json_build_object('name', col.name, 'url', col.url)
                             ORDER BY col.sort_order)
             FROM dc_new.course_offer_links col
             WHERE col.offer_id = co.id
           ), '[]'::json) AS links
         FROM dc_new.bookings b
         JOIN dc_new.course_offers co  ON b.offer_id      = co.id
         JOIN dc_new.disciplines  d    ON co.discipline_id = d.id
         JOIN dc_new.programs     p    ON co.program_id    = p.id
         JOIN dc_new.faculties    f    ON p.faculty_id     = f.id
         JOIN dc_new.users        u    ON co.teacher_id    = u.id
         WHERE b.student_id = $1 AND b.status = 'active'
         ORDER BY b.created_at DESC`,
        [user.id]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/student/search — open offers with available slots
app.get(
  "/api/student/search",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
          co.id,
          d.name  AS discipline,
          p.name  AS program,
          f.name  AS faculty,
          co.total_groups,
          u.first_name,
          u.last_name,
          u.email AS teacher_email,
          COALESCE((
            SELECT array_agg(m.number ORDER BY m.number)
            FROM dc_new.course_offer_modules com
            JOIN dc_new.modules m ON com.module_id = m.id
            WHERE com.offer_id = co.id
          ), ARRAY[]::int[]) AS modules,
          (co.total_groups - COALESCE((
            SELECT SUM(COALESCE(b.num_groups, 1)) FROM dc_new.bookings b
            WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
          ), 0)) AS available_groups
        FROM dc_new.course_offers co
        JOIN dc_new.disciplines d ON co.discipline_id = d.id
        JOIN dc_new.programs    p ON co.program_id    = p.id
        JOIN dc_new.faculties   f ON p.faculty_id     = f.id
        JOIN dc_new.users       u ON co.teacher_id    = u.id
        WHERE co.status = 'open'
          AND (co.total_groups - COALESCE((
            SELECT SUM(COALESCE(b.num_groups, 1)) FROM dc_new.bookings b
            WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
          ), 0)) > 0
        ORDER BY co.created_at DESC`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// PUT /api/student/profile — save section-1 survey data
app.put<{
  Body: {
    firstName: string;
    lastName: string;
    middleName?: string;
    telegram: string;
    birthday: string;
    citizenship: string;
    phone: string;
  };
}>(
  "/api/student/profile",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { firstName, lastName, middleName, telegram, birthday, citizenship, phone } = request.body;

    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE dc_new.users
         SET first_name = $1, last_name = $2, middle_name = $3
         WHERE id = $4`,
        [firstName, lastName, middleName ?? null, user.id]
      );

      await client.query(
        `UPDATE dc_new.student_profiles
         SET telegram = $1, birthday = $2, citizenship = $3, phone = $4
         WHERE user_id = $5`,
        [telegram, birthday,
         citizenship ? canonicalCitizenship(await loadEducationNames(client), citizenship) : citizenship,
         phone, user.id]
      );

      return { success: true };
    } finally {
      client.release();
    }
  }
);

// PUT /api/student/education — save section-2 education data
app.put<{
  Body: {
    faculty: string;
    program: string;
    studyYear: number;
    hasDebts: boolean;
    rating: string;
    digitalLiteracyScore: string | null;
    programmingScore: string | null;
    dataAnalysisScore: string | null;
  };
}>(
  "/api/student/education",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { faculty, program, studyYear, hasDebts, rating,
            digitalLiteracyScore, programmingScore, dataAnalysisScore } = request.body;

    if (!faculty?.trim() || !program?.trim()) {
      return reply.code(400).send({ error: "Укажите факультет и образовательную программу" });
    }

    const client = await app.pg.connect();
    try {
      const names = await loadEducationNames(client);
      const facultyName = canonicalFaculty(names, faculty);
      const programName = canonicalProgram(names, facultyName, program);
      await client.query(
        `UPDATE dc_new.student_profiles
         SET edu_faculty = $1, edu_program = $2, study_year = $3, debts = $4,
             edu_rating = $5, digital_literacy_score = $6,
             python_score = $7, data_analysis_score = $8
         WHERE user_id = $9`,
        [facultyName, programName, studyYear, hasDebts ? 'yes' : 'no',
         rating.trim(), digitalLiteracyScore, programmingScore, dataAnalysisScore, user.id]
      );
      return { success: true };
    } finally {
      client.release();
    }
  }
);

// PUT /api/student/priorities — save priority discipline data (priority 1 or 2)
app.put<{
  Body: {
    disciplineId: number;
    desiredGroupSize: number;
    answers: Record<string, string>;
    priority?: number;
  };
}>(
  "/api/student/priorities",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { disciplineId, desiredGroupSize, answers, priority = 1 } = request.body;

    if (!disciplineId) {
      return reply.code(400).send({ error: "Не выбрана дисциплина" });
    }

    const client = await app.pg.connect();
    try {
      await client.query("BEGIN");

      // student_preferences carries two independent UNIQUE constraints —
      // (student_id, priority) and (student_id, discipline_id) — so a plain
      // "ON CONFLICT (student_id, priority)" upsert can still throw an
      // unhandled 23505 if this discipline was previously saved under the
      // OTHER priority (e.g. swapping which slot a discipline occupies).
      // Clearing both potential collisions first makes the write unconditional.
      await client.query(
        `DELETE FROM dc_new.student_preferences
         WHERE student_id = $1 AND (priority = $2 OR discipline_id = $3)`,
        [user.id, priority, disciplineId]
      );

      await client.query(
        `INSERT INTO dc_new.student_preferences (student_id, discipline_id, priority, desired_group_size)
         VALUES ($1, $2, $3, $4)`,
        [user.id, disciplineId, priority, desiredGroupSize]
      );

      // Merge answers for this priority into the experience JSON field
      const cur = await client.query(
        `SELECT experience FROM dc_new.student_profiles WHERE user_id = $1`,
        [user.id]
      );
      let all: Record<string, Record<string, string>> = {};
      try { all = JSON.parse(cur.rows[0]?.experience ?? '{}'); } catch {}
      all[String(priority)] = answers;

      await client.query(
        `UPDATE dc_new.student_profiles SET experience = $1 WHERE user_id = $2`,
        [JSON.stringify(all), user.id]
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

// DELETE /api/student/priorities/:priority — unset a priority slot (e.g. "not considering 2nd priority")
app.delete<{ Params: { priority: string } }>(
  "/api/student/priorities/:priority",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const priority = parseInt(request.params.priority, 10);
    if (isNaN(priority)) {
      return reply.code(400).send({ error: "Некорректный приоритет" });
    }

    const client = await app.pg.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `DELETE FROM dc_new.student_preferences WHERE student_id = $1 AND priority = $2`,
        [user.id, priority]
      );

      const cur = await client.query(
        `SELECT experience FROM dc_new.student_profiles WHERE user_id = $1`,
        [user.id]
      );
      let all: Record<string, Record<string, string>> = {};
      try { all = JSON.parse(cur.rows[0]?.experience ?? '{}'); } catch {}
      delete all[String(priority)];

      await client.query(
        `UPDATE dc_new.student_profiles SET experience = $1 WHERE user_id = $2`,
        [JSON.stringify(all), user.id]
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

// PUT /api/student/recommendation — save section-6 teacher recommendation email
app.put<{
  Body: { teacherEmail: string };
}>(
  "/api/student/recommendation",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { teacherEmail } = request.body;

    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE dc_new.student_profiles
         SET recommendation_email = $1, recommendation_available = true
         WHERE user_id = $2`,
        [teacherEmail, user.id]
      );
      return { success: true };
    } finally {
      client.release();
    }
  }
);

// PUT /api/student/motivation — save section-5 motivation data
app.put<{
  Body: { motivation: string; achievements: string; priorCourses: string };
}>(
  "/api/student/motivation",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { motivation, achievements, priorCourses } = request.body;

    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE dc_new.student_profiles
         SET motivation_text = $1, achievements = $2, prior_courses = $3
         WHERE user_id = $4`,
        [motivation, achievements, priorCourses, user.id]
      );
      return { success: true };
    } finally {
      client.release();
    }
  }
);

// POST /api/student/survey/complete — mark questionnaire as done
app.post(
  "/api/student/survey/complete",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE dc_new.student_profiles SET questionnaire_completed = true WHERE user_id = $1`,
        [user.id]
      );
      return { success: true };
    } finally {
      client.release();
    }
  }
);

// POST /api/student/bookings — student books an offer
app.post<{
  Body: { offerId: number; paymentType: "money" | "credits"; numGroups: number };
}>(
  "/api/student/bookings",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { offerId, paymentType, numGroups } = request.body;

    if (!offerId || !paymentType || !["money", "credits"].includes(paymentType)) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    const groups = Number(numGroups) || 1;
    if (groups < 1 || groups > 4) {
      return reply.code(400).send({ error: "Количество групп должно быть от 1 до 4" });
    }

    const client = await app.pg.connect();
    try {
      // Check offer exists and is open
      const offerResult = await client.query(
        `SELECT
           co.id,
           co.teacher_id,
           co.total_groups,
           COALESCE((
             SELECT SUM(COALESCE(b.num_groups, 1)) FROM dc_new.bookings b
             WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
           ), 0) AS booked_count
         FROM dc_new.course_offers co
         WHERE co.id = $1 AND co.status = 'open'`,
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return reply.code(404).send({ error: "Предложение не найдено или неактивно" });
      }

      const offer = offerResult.rows[0];
      const available = Number(offer.total_groups) - Number(offer.booked_count);

      if (available <= 0) {
        return reply.code(409).send({ error: "Нет свободных мест" });
      }

      if (groups > available) {
        return reply.code(409).send({ error: `Доступно только ${available} групп(ы)` });
      }

      // Upsert: re-apply if a previous booking was cancelled, reject if active/pending
      const insertResult = await client.query(
        `INSERT INTO dc_new.bookings (offer_id, student_id, payment_type, num_groups, status, created_by_teacher_id, created_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, now())
         ON CONFLICT (offer_id, student_id) DO UPDATE
           SET status               = 'pending',
               payment_type         = EXCLUDED.payment_type,
               num_groups           = EXCLUDED.num_groups,
               created_by_teacher_id = EXCLUDED.created_by_teacher_id,
               cancelled_at         = NULL,
               cancelled_by_user_id = NULL,
               created_at           = now()
           WHERE dc_new.bookings.status = 'cancelled'
         RETURNING id`,
        [offerId, user.id, paymentType, groups, offer.teacher_id]
      );

      if (insertResult.rows.length === 0) {
        return reply.code(409).send({ error: "Вы уже записаны на это предложение" });
      }

      return reply.code(201).send({ bookingId: insertResult.rows[0].id });
    } catch (error: unknown) {
      throw error;
    } finally {
      client.release();
    }
  }
);

// ─── Teacher endpoints ────────────────────────────────────────────────────────

// POST /api/teacher/offers — teacher creates their own course offer
// (upserts faculty and program by name)
app.post<{
  Body: {
    disciplineId: number;
    facultyName: string;
    programName: string;
    totalGroups: number;
    moduleIds: number[];
    links: { name: string; url: string }[];
  };
}>(
  "/api/teacher/offers",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { disciplineId, facultyName, programName, totalGroups, moduleIds, links } = request.body;

    if (!disciplineId || !facultyName?.trim() || !programName?.trim() || !totalGroups || !moduleIds?.length) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    if (Number(totalGroups) < 1) {
      return reply.code(400).send({ error: "Количество групп должно быть больше нуля" });
    }

    // Duplicates would violate the (offer_id, module_id) primary key
    const uniqueModuleIds = [...new Set(moduleIds)];

    const client = await app.pg.connect();
    try {
      await client.query("BEGIN");

      // Upsert faculty
      const facultyResult = await client.query(
        `INSERT INTO dc_new.faculties (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [normalizeName(facultyName)]
      );
      const facultyId = facultyResult.rows[0].id;

      // Upsert program (unique per faculty)
      const programResult = await client.query(
        `INSERT INTO dc_new.programs (faculty_id, name)
         VALUES ($1, $2)
         ON CONFLICT (faculty_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [facultyId, normalizeName(programName)]
      );
      const programId = programResult.rows[0].id;

      // Create offer
      const result = await client.query(
        `INSERT INTO dc_new.course_offers (teacher_id, discipline_id, program_id, total_groups)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.id, disciplineId, programId, totalGroups]
      );

      const offerId = result.rows[0].id;

      for (const moduleId of uniqueModuleIds) {
        await client.query(
          `INSERT INTO dc_new.course_offer_modules (offer_id, module_id) VALUES ($1, $2)`,
          [offerId, moduleId]
        );
      }

      if (links && links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (link && link.name && link.url) {
            await client.query(
              `INSERT INTO dc_new.course_offer_links (offer_id, name, url, sort_order)
               VALUES ($1, $2, $3, $4)`,
              [offerId, link.name, link.url, i]
            );
          }
        }
      }

      await client.query("COMMIT");
      return reply.code(201).send({ id: offerId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

// PUT /api/teacher/offers/:id — teacher edits one of their own offers in place
// (overwrites the existing row; modules and links are replaced, not appended)
app.put<{
  Params: { id: string };
  Body: {
    disciplineId: number;
    facultyName: string;
    programName: string;
    totalGroups: number;
    moduleIds: number[];
    links: { name: string; url: string }[];
  };
}>(
  "/api/teacher/offers/:id",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const offerId = parseInt(request.params.id, 10);
    if (isNaN(offerId)) {
      return reply.code(400).send({ error: "Некорректный id" });
    }

    const { disciplineId, facultyName, programName, totalGroups, moduleIds, links } = request.body;

    if (!disciplineId || !facultyName?.trim() || !programName?.trim() || !totalGroups || !moduleIds?.length) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    if (Number(totalGroups) < 1) {
      return reply.code(400).send({ error: "Количество групп должно быть больше нуля" });
    }

    // Duplicates would violate the (offer_id, module_id) primary key
    const uniqueModuleIds = [...new Set(moduleIds)];

    const client = await app.pg.connect();
    try {
      // Offer must exist, belong to this teacher, and still be open
      const existing = await client.query(
        `SELECT co.id,
           COALESCE((
             SELECT SUM(COALESCE(b.num_groups, 1)) FROM dc_new.bookings b
             WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
           ), 0) AS booked_count
         FROM dc_new.course_offers co
         WHERE co.id = $1 AND co.teacher_id = $2 AND co.status = 'open'`,
        [offerId, user.id]
      );

      if (existing.rows.length === 0) {
        return reply.code(404).send({ error: "Заявка не найдена" });
      }

      // Can't shrink the request below what is already handed out to assistants
      const bookedCount = Number(existing.rows[0].booked_count);
      if (Number(totalGroups) < bookedCount) {
        return reply.code(409).send({
          error: `Уже назначено групп: ${bookedCount}. Нельзя указать меньше.`,
        });
      }

      await client.query("BEGIN");

      // Upsert faculty
      const facultyResult = await client.query(
        `INSERT INTO dc_new.faculties (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [normalizeName(facultyName)]
      );
      const facultyId = facultyResult.rows[0].id;

      // Upsert program (unique per faculty)
      const programResult = await client.query(
        `INSERT INTO dc_new.programs (faculty_id, name)
         VALUES ($1, $2)
         ON CONFLICT (faculty_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [facultyId, normalizeName(programName)]
      );
      const programId = programResult.rows[0].id;

      // Overwrite the existing offer row
      await client.query(
        `UPDATE dc_new.course_offers
         SET discipline_id = $1, program_id = $2, total_groups = $3, updated_at = now()
         WHERE id = $4`,
        [disciplineId, programId, totalGroups, offerId]
      );

      // Replace modules
      await client.query(
        `DELETE FROM dc_new.course_offer_modules WHERE offer_id = $1`,
        [offerId]
      );
      for (const moduleId of uniqueModuleIds) {
        await client.query(
          `INSERT INTO dc_new.course_offer_modules (offer_id, module_id) VALUES ($1, $2)`,
          [offerId, moduleId]
        );
      }

      // Replace links
      await client.query(
        `DELETE FROM dc_new.course_offer_links WHERE offer_id = $1`,
        [offerId]
      );
      if (links && links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (link && link.name && link.url) {
            await client.query(
              `INSERT INTO dc_new.course_offer_links (offer_id, name, url, sort_order)
               VALUES ($1, $2, $3, $4)`,
              [offerId, link.name, link.url, i]
            );
          }
        }
      }

      await client.query("COMMIT");
      return { id: offerId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

// PUT /api/teacher/bookings/:bookingId — edit one assistant's card: their own
// group count plus the parent request's fields. The assistant can't be changed.
app.put<{
  Params: { bookingId: string };
  Body: {
    numGroups: number;
    paymentType?: "money" | "credits";
    disciplineId: number;
    facultyName: string;
    programName: string;
    moduleIds: number[];
    links: { name: string; url: string }[];
  };
}>(
  "/api/teacher/bookings/:bookingId",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const bookingId = parseInt(request.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return reply.code(400).send({ error: "Некорректный id" });
    }

    const { numGroups, paymentType, disciplineId, facultyName, programName, moduleIds, links } = request.body;

    if (!numGroups || !disciplineId || !facultyName?.trim() || !programName?.trim() || !moduleIds?.length) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    if (paymentType && !["money", "credits"].includes(paymentType)) {
      return reply.code(400).send({ error: "Некорректный формат оплаты" });
    }

    // Duplicates would violate the (offer_id, module_id) primary key
    const uniqueModuleIds = [...new Set(moduleIds)];

    const groups = Number(numGroups);
    if (groups < 1 || groups > 4) {
      return reply.code(400).send({ error: "Количество групп должно быть от 1 до 4" });
    }

    const client = await app.pg.connect();
    try {
      // Booking must belong to an open offer owned by this teacher
      const existing = await client.query(
        `SELECT b.id, co.id AS offer_id, co.total_groups,
           COALESCE((
             SELECT SUM(COALESCE(b2.num_groups, 1)) FROM dc_new.bookings b2
             WHERE b2.offer_id = co.id
               AND b2.id <> b.id
               AND b2.status IN ('active', 'pending')
           ), 0) AS other_groups
         FROM dc_new.bookings b
         JOIN dc_new.course_offers co ON co.id = b.offer_id
         WHERE b.id = $1 AND co.teacher_id = $2 AND co.status = 'open'`,
        [bookingId, user.id]
      );

      if (existing.rows.length === 0) {
        return reply.code(404).send({ error: "Запись не найдена" });
      }

      const { offer_id: offerId, total_groups: totalGroups, other_groups: otherGroups } = existing.rows[0];
      const available = Number(totalGroups) - Number(otherGroups);

      if (groups > available) {
        return reply.code(409).send({ error: `Доступно только ${available} групп(ы)` });
      }

      await client.query("BEGIN");

      // Upsert faculty
      const facultyResult = await client.query(
        `INSERT INTO dc_new.faculties (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [normalizeName(facultyName)]
      );
      const facultyId = facultyResult.rows[0].id;

      // Upsert program (unique per faculty)
      const programResult = await client.query(
        `INSERT INTO dc_new.programs (faculty_id, name)
         VALUES ($1, $2)
         ON CONFLICT (faculty_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [facultyId, normalizeName(programName)]
      );
      const programId = programResult.rows[0].id;

      // Overwrite the parent request (total_groups stays as-is here)
      await client.query(
        `UPDATE dc_new.course_offers
         SET discipline_id = $1, program_id = $2, updated_at = now()
         WHERE id = $3`,
        [disciplineId, programId, offerId]
      );

      // Replace modules
      await client.query(
        `DELETE FROM dc_new.course_offer_modules WHERE offer_id = $1`,
        [offerId]
      );
      for (const moduleId of uniqueModuleIds) {
        await client.query(
          `INSERT INTO dc_new.course_offer_modules (offer_id, module_id) VALUES ($1, $2)`,
          [offerId, moduleId]
        );
      }

      // Replace links
      await client.query(
        `DELETE FROM dc_new.course_offer_links WHERE offer_id = $1`,
        [offerId]
      );
      if (links && links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          if (link && link.name && link.url) {
            await client.query(
              `INSERT INTO dc_new.course_offer_links (offer_id, name, url, sort_order)
               VALUES ($1, $2, $3, $4)`,
              [offerId, link.name, link.url, i]
            );
          }
        }
      }

      // This assistant's own group count and payment format
      await client.query(
        `UPDATE dc_new.bookings
         SET num_groups = $1,
             payment_type = COALESCE($2::dc_new.payment_type, payment_type)
         WHERE id = $3`,
        [groups, paymentType ?? null, bookingId]
      );

      await client.query("COMMIT");
      return { bookingId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
);

// GET /api/teacher/groups — open offers for the current teacher with bookings
app.get(
  "/api/teacher/groups",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           co.id,
           co.discipline_id,
           d.name AS discipline,
           f.name AS faculty,
           p.name AS program,
           co.total_groups,
           (co.total_groups - COALESCE((
             SELECT SUM(COALESCE(b2.num_groups, 1)) FROM dc_new.bookings b2
             WHERE b2.offer_id = co.id AND b2.status IN ('active', 'pending')
           ), 0)) AS available_groups,
           COALESCE((
             SELECT array_agg(m.number ORDER BY m.number)
             FROM dc_new.course_offer_modules com
             JOIN dc_new.modules m ON com.module_id = m.id
             WHERE com.offer_id = co.id
           ), ARRAY[]::int[]) AS modules,
           COALESCE((
             SELECT json_agg(json_build_object('name', col.name, 'url', col.url)
                             ORDER BY col.sort_order)
             FROM dc_new.course_offer_links col
             WHERE col.offer_id = co.id
           ), '[]'::json) AS links,
           COALESCE((
             SELECT json_agg(json_build_object(
               'booking_id',         b.id,
               'status',             b.status,
               'payment_type',       b.payment_type,
               'num_groups',         b.num_groups,
               'student_id',         b.student_id,
               'student_first_name', s.first_name,
               'student_last_name',  s.last_name,
               'student_email',      s.email,
               'student_telegram',   sp.telegram
             ))
             FROM dc_new.bookings b
             JOIN dc_new.users s ON s.id = b.student_id
             LEFT JOIN dc_new.student_profiles sp ON sp.user_id = b.student_id
             WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
           ), '[]'::json) AS bookings
         FROM dc_new.course_offers co
         JOIN dc_new.disciplines d ON co.discipline_id = d.id
         JOIN dc_new.programs    p ON co.program_id    = p.id
         JOIN dc_new.faculties   f ON p.faculty_id     = f.id
         WHERE co.teacher_id = $1 AND co.status = 'open'
         ORDER BY co.created_at DESC`,
        [user.id]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// DELETE /api/teacher/offers/:offerId/free-slots — remove an offer's free groups.
// With no bookings the offer is archived; otherwise total_groups shrinks to the
// booked count so existing assistants keep their groups.
app.delete<{ Params: { offerId: string } }>(
  "/api/teacher/offers/:offerId/free-slots",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const offerId = Number(request.params.offerId);
    if (!offerId) {
      return reply.code(400).send({ error: "Invalid offer id" });
    }

    const client = await app.pg.connect();
    try {
      // Single statement so the booked count can't change between read and write
      const result = await client.query(
        `UPDATE dc_new.course_offers co
         SET status       = CASE WHEN booked.n = 0 THEN 'archived'::dc_new.offer_status ELSE co.status END,
             total_groups = CASE WHEN booked.n = 0 THEN co.total_groups ELSE booked.n END,
             updated_at   = now()
         FROM (
           SELECT COALESCE(SUM(COALESCE(b.num_groups, 1)), 0)::int AS n
           FROM dc_new.bookings b
           WHERE b.offer_id = $1 AND b.status IN ('active', 'pending')
         ) AS booked
         WHERE co.id = $1
           AND co.teacher_id = $2
           AND co.status = 'open'
           AND co.total_groups > booked.n
         RETURNING co.status, co.total_groups`,
        [offerId, user.id]
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Курс не найден или свободных мест нет" });
      }
      const row = result.rows[0];
      return reply.code(200).send({
        offerId,
        archived: row.status === "archived",
        totalGroups: row.total_groups,
      });
    } finally {
      client.release();
    }
  }
);

// PATCH /api/teacher/bookings/:bookingId/accept — promote pending → active
app.patch<{ Params: { bookingId: string } }>(
  "/api/teacher/bookings/:bookingId/accept",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const bookingId = Number(request.params.bookingId);
    if (!bookingId) {
      return reply.code(400).send({ error: "Invalid booking id" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `UPDATE dc_new.bookings b
         SET status = 'active'
         FROM dc_new.course_offers co
         WHERE b.id = $1
           AND b.offer_id = co.id
           AND co.teacher_id = $2
           AND co.status = 'open'
           AND b.status = 'pending'
         RETURNING b.id`,
        [bookingId, user.id]
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Booking not found or already accepted" });
      }
      return reply.code(200).send({ bookingId: result.rows[0].id });
    } finally {
      client.release();
    }
  }
);

// DELETE /api/teacher/bookings/:bookingId — cancel a booking (set status to 'cancelled')
app.delete<{ Params: { bookingId: string } }>(
  "/api/teacher/bookings/:bookingId",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const bookingId = Number(request.params.bookingId);
    if (!bookingId) {
      return reply.code(400).send({ error: "Invalid booking id" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `UPDATE dc_new.bookings b
         SET status = 'cancelled', cancelled_at = now(), cancelled_by_user_id = $2
         FROM dc_new.course_offers co
         WHERE b.id = $1
           AND b.offer_id = co.id
           AND co.teacher_id = $2
           AND b.status <> 'cancelled'
         RETURNING b.id`,
        [bookingId, user.id]
      );
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Booking not found" });
      }
      return reply.code(200).send({ bookingId: result.rows[0].id });
    } finally {
      client.release();
    }
  }
);

// GET /api/teacher/analytics — the current teacher's own course statistics
app.get(
  "/api/teacher/analytics",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      // The current teacher's open courses and how full they are
      const courses = await client.query(
        `SELECT
           co.id,
           d.name AS discipline,
           f.name AS faculty,
           p.name AS program,
           co.total_groups,
           COALESCE(SUM(COALESCE(b.num_groups, 1)) FILTER (WHERE b.status = 'active'), 0)::int  AS active_groups,
           COALESCE(SUM(COALESCE(b.num_groups, 1)) FILTER (WHERE b.status = 'pending'), 0)::int AS pending_groups,
           COUNT(b.id) FILTER (WHERE b.status = 'pending')::int AS pending_count,
           COALESCE((
             SELECT array_agg(m.number ORDER BY m.number)
             FROM dc_new.course_offer_modules com
             JOIN dc_new.modules m ON com.module_id = m.id
             WHERE com.offer_id = co.id
           ), ARRAY[]::int[]) AS modules
         FROM dc_new.course_offers co
         JOIN dc_new.disciplines d ON d.id = co.discipline_id
         JOIN dc_new.programs    p ON p.id = co.program_id
         JOIN dc_new.faculties   f ON f.id = p.faculty_id
         LEFT JOIN dc_new.bookings b ON b.offer_id = co.id AND b.status IN ('active', 'pending')
         WHERE co.teacher_id = $1 AND co.status = 'open'
         GROUP BY co.id, d.name, f.name, p.name
         ORDER BY co.created_at DESC`,
        [user.id]
      );

      // Assistants booked on this teacher's open courses and their share of the load
      const assistants = await client.query(
        `SELECT
           u.id,
           u.first_name,
           u.last_name,
           COALESCE(SUM(COALESCE(b.num_groups, 1)) FILTER (WHERE b.status = 'active'), 0)::int  AS active_groups,
           COALESCE(SUM(COALESCE(b.num_groups, 1)) FILTER (WHERE b.status = 'pending'), 0)::int AS pending_groups,
           COUNT(DISTINCT b.offer_id)::int AS courses,
           array_agg(DISTINCT b.payment_type::text) AS payment_types
         FROM dc_new.bookings b
         JOIN dc_new.course_offers co ON co.id = b.offer_id
         JOIN dc_new.users u ON u.id = b.student_id
         WHERE co.teacher_id = $1 AND co.status = 'open' AND b.status IN ('active', 'pending')
         GROUP BY u.id, u.first_name, u.last_name
         ORDER BY SUM(COALESCE(b.num_groups, 1)) DESC, u.last_name, u.first_name`,
        [user.id]
      );

      return { courses: courses.rows, assistants: assistants.rows };
    } finally {
      client.release();
    }
  }
);

// GET /api/teacher/search — students with their preferences and active assignment count
app.get(
  "/api/teacher/search",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           u.id,
           u.first_name,
           u.last_name,
           u.email,
           sp.study_year,
           sp.edu_faculty,
           sp.edu_program,
           sp.telegram,
           COALESCE((
             SELECT json_agg(json_build_object(
               'priority', spr.priority,
               'discipline', d.name,
               'desired_group_size', spr.desired_group_size
             ) ORDER BY spr.priority)
             FROM dc_new.student_preferences spr
             JOIN dc_new.disciplines d ON d.id = spr.discipline_id
             WHERE spr.student_id = u.id
           ), '[]'::json) AS preferences,
           COALESCE((
             SELECT COUNT(*)
             FROM dc_new.bookings b
             WHERE b.student_id = u.id AND b.status = 'active'
           ), 0)::int AS active_assignments,
           COALESCE((
             SELECT json_agg(json_build_object(
               'booking_id', b.id,
               'status',     b.status,
               'faculty',    f.name,
               'discipline', d.name,
               'teacher',    TRIM(t.last_name || ' ' || t.first_name),
               'num_groups', COALESCE(b.num_groups, 1),
               'modules',    COALESCE((
                 SELECT array_agg(m.number ORDER BY m.number)
                 FROM dc_new.course_offer_modules com
                 JOIN dc_new.modules m ON com.module_id = m.id
                 WHERE com.offer_id = co.id
               ), ARRAY[]::int[])
             ) ORDER BY b.status, d.name)
             FROM dc_new.bookings b
             JOIN dc_new.course_offers co ON co.id = b.offer_id
             JOIN dc_new.disciplines d    ON d.id = co.discipline_id
             JOIN dc_new.programs p       ON p.id = co.program_id
             JOIN dc_new.faculties f      ON f.id = p.faculty_id
             JOIN dc_new.users t          ON t.id = co.teacher_id
             WHERE b.student_id = u.id AND b.status IN ('active', 'pending')
           ), '[]'::json) AS assignments
         FROM dc_new.users u
         LEFT JOIN dc_new.student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'student' and sp.questionnaire_completed = true
         ORDER BY u.last_name, u.first_name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/teacher/students/:id — full survey answers for one student
app.get<{ Params: { id: string } }>(
  "/api/teacher/students/:id",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const studentId = parseInt(request.params.id, 10);
    if (isNaN(studentId)) {
      return reply.code(400).send({ error: "Некорректный id" });
    }

    const client = await app.pg.connect();
    try {
      const profileResult = await client.query(
        `SELECT
           u.id, u.first_name, u.last_name, u.middle_name, u.email,
           sp.telegram, sp.birthday, sp.citizenship, sp.phone,
           sp.edu_faculty, sp.edu_program, sp.study_year, sp.debts, sp.edu_rating,
           sp.digital_literacy_score, sp.python_score, sp.data_analysis_score,
           sp.motivation_text, sp.achievements, sp.prior_courses, sp.experience,
           sp.recommendation_available, sp.recommendation_email
         FROM dc_new.users u
         LEFT JOIN dc_new.student_profiles sp ON sp.user_id = u.id
         WHERE u.id = $1 AND u.role = 'student'`,
        [studentId]
      );

      if (profileResult.rows.length === 0) {
        return reply.code(404).send({ error: "Студент не найден" });
      }

      const row = profileResult.rows[0];

      let experience: Record<string, Record<string, string>> = {};
      try { experience = JSON.parse(row.experience ?? "{}"); } catch { /* malformed, ignore */ }

      const preferencesResult = await client.query(
        `SELECT spr.priority, d.name AS discipline, spr.desired_group_size
         FROM dc_new.student_preferences spr
         JOIN dc_new.disciplines d ON d.id = spr.discipline_id
         WHERE spr.student_id = $1
         ORDER BY spr.priority`,
        [studentId]
      );

      const priorities = preferencesResult.rows.map((p: {
        priority: number;
        discipline: string;
        desired_group_size: number;
      }) => ({
        priority: p.priority,
        discipline: p.discipline,
        desiredGroupSize: p.desired_group_size,
        answers: experience[String(p.priority)] ?? {},
      }));

      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        middleName: row.middle_name,
        email: row.email,
        telegram: row.telegram,
        birthday: row.birthday,
        citizenship: row.citizenship,
        phone: row.phone,
        eduFaculty: row.edu_faculty,
        eduProgram: row.edu_program,
        studyYear: row.study_year,
        debts: row.debts,
        eduRating: row.edu_rating,
        digitalLiteracyScore: row.digital_literacy_score,
        programmingScore: row.python_score,
        dataAnalysisScore: row.data_analysis_score,
        motivation: row.motivation_text,
        achievements: row.achievements,
        priorCourses: row.prior_courses,
        recommendationAvailable: row.recommendation_available,
        recommendationEmail: row.recommendation_email,
        priorities,
      };
    } finally {
      client.release();
    }
  }
);

// POST /api/teacher/assign — teacher assigns a student assistant to their offer
app.post<{
  Body: {
    offerId: number;
    studentId: number;
    numGroups: number;
    paymentType?: "money" | "credits";
  };
}>(
  "/api/teacher/assign",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { offerId, studentId, numGroups, paymentType = "money" } = request.body;

    if (!offerId || !studentId || !numGroups) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    if (!["money", "credits"].includes(paymentType)) {
      return reply.code(400).send({ error: "Некорректный формат оплаты" });
    }

    const groups = Number(numGroups);
    if (groups < 1 || groups > 4) {
      return reply.code(400).send({ error: "Количество групп должно быть от 1 до 4" });
    }

    const client = await app.pg.connect();
    try {
      // Verify offer belongs to this teacher and is open
      const offerResult = await client.query(
        `SELECT co.id, co.total_groups,
           COALESCE((
             SELECT SUM(COALESCE(b.num_groups, 1))
             FROM dc_new.bookings b
             WHERE b.offer_id = co.id AND b.status IN ('active', 'pending')
           ), 0) AS booked_count
         FROM dc_new.course_offers co
         WHERE co.id = $1 AND co.teacher_id = $2 AND co.status = 'open'`,
        [offerId, user.id]
      );

      if (offerResult.rows.length === 0) {
        return reply.code(404).send({ error: "Предложение не найдено" });
      }

      const offer = offerResult.rows[0];
      const available = Number(offer.total_groups) - Number(offer.booked_count);

      if (groups > available) {
        return reply.code(409).send({ error: `Доступно только ${available} групп(ы)` });
      }

      // The student must really be a student
      const studentCheck = await client.query(
        `SELECT id FROM dc_new.users WHERE id = $1 AND role = 'student'`,
        [studentId]
      );
      if (studentCheck.rows.length === 0) {
        return reply.code(404).send({ error: "Студент не найден" });
      }

      // A previously cancelled booking still occupies the (offer_id, student_id)
      // unique slot, so re-assigning someone who was removed has to revive that
      // row rather than insert a new one.
      const insertResult = await client.query(
        `INSERT INTO dc_new.bookings
           (offer_id, student_id, payment_type, num_groups, status, created_by_teacher_id, created_at)
         VALUES ($1, $2, $3, $4, 'active', $5, now())
         ON CONFLICT (offer_id, student_id) DO UPDATE
           SET status                = 'active',
               payment_type          = EXCLUDED.payment_type,
               num_groups            = EXCLUDED.num_groups,
               created_by_teacher_id = EXCLUDED.created_by_teacher_id,
               cancelled_at          = NULL,
               cancelled_by_user_id  = NULL,
               created_at            = now()
           WHERE dc_new.bookings.status = 'cancelled'
         RETURNING id`,
        [offerId, studentId, paymentType, groups, user.id]
      );

      if (insertResult.rows.length === 0) {
        // Conflict with a row that is not cancelled — say which case it is
        const current = await client.query(
          `SELECT status FROM dc_new.bookings WHERE offer_id = $1 AND student_id = $2`,
          [offerId, studentId]
        );
        const status = current.rows[0]?.status;
        return reply.code(409).send({
          error: status === "pending"
            ? "Студент уже подал заявку на этот курс — подтвердите её"
            : "Студент уже назначен на это предложение",
        });
      }

      return reply.code(201).send({ bookingId: insertResult.rows[0].id });
    } finally {
      client.release();
    }
  }
);

// ─── Error handling ────────────────────────────────────────────────────────────

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const statusCode =
    error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
  const validation =
    error && typeof error === "object" && "validation" in error ? error.validation : undefined;

  if (validation) {
    reply.code(400).send({ error: "Validation Error", message: errorMessage, details: validation });
    return;
  }

  if (statusCode === 401) {
    reply.code(401).send({ error: "Unauthorized", message: errorMessage });
    return;
  }

  reply.code(statusCode).send({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : errorMessage,
    ...(process.env.NODE_ENV !== "production" && errorStack && { stack: errorStack }),
  });
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, closing server gracefully...`);
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`Error during shutdown: ${errorMessage}`);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`🚀 Сервер запущен на http://${host}:${port}`);
  app.log.info(`📊 Окружение: ${process.env.NODE_ENV || "development"}`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  app.log.error(`Не удалось запустить сервер: ${errorMessage}`);
  process.exit(1);
}
