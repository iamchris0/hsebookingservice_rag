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

// ─── Lookup tables ────────────────────────────────────────────────────────────

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
        [telegram, birthday, citizenship, phone, user.id]
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

    const client = await app.pg.connect();
    try {
      await client.query(
        `UPDATE dc_new.student_profiles
         SET edu_faculty = $1, edu_program = $2, study_year = $3, debts = $4,
             edu_rating = $5, digital_literacy_score = $6,
             python_score = $7, data_analysis_score = $8
         WHERE user_id = $9`,
        [faculty, program, studyYear, hasDebts ? 'yes' : 'no',
         rating, digitalLiteracyScore, programmingScore, dataAnalysisScore, user.id]
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

    const client = await app.pg.connect();
    try {
      await client.query(
        `INSERT INTO dc_new.student_preferences (student_id, discipline_id, priority, desired_group_size)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, priority) DO UPDATE
           SET discipline_id = EXCLUDED.discipline_id,
               desired_group_size = EXCLUDED.desired_group_size`,
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

      return { success: true };
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

    const client = await app.pg.connect();
    try {
      // Upsert faculty
      const facultyResult = await client.query(
        `INSERT INTO dc_new.faculties (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [facultyName.trim()]
      );
      const facultyId = facultyResult.rows[0].id;

      // Upsert program (unique per faculty)
      const programResult = await client.query(
        `INSERT INTO dc_new.programs (faculty_id, name)
         VALUES ($1, $2)
         ON CONFLICT (faculty_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [facultyId, programName.trim()]
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

      for (const moduleId of moduleIds) {
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

      return reply.code(201).send({ id: offerId });
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
           ), 0)::int AS active_assignments
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

// POST /api/teacher/assign — teacher assigns a student assistant to their offer
app.post<{
  Body: { offerId: number; studentId: number; numGroups: number };
}>(
  "/api/teacher/assign",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (user.role !== "teacher") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { offerId, studentId, numGroups } = request.body;

    if (!offerId || !studentId || !numGroups) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
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

      const insertResult = await client.query(
        `INSERT INTO dc_new.bookings
           (offer_id, student_id, payment_type, num_groups, status, created_by_teacher_id)
         VALUES ($1, $2, 'money', $3, 'active', $4)
         RETURNING id`,
        [offerId, studentId, groups, user.id]
      );

      return reply.code(201).send({ bookingId: insertResult.rows[0].id });
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return reply.code(409).send({ error: "Студент уже назначен на это предложение" });
      }
      throw error;
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
