import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import postgres from "@fastify/postgres";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие обязательных переменных окружения
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

// 1. Helmet - защита заголовков безопасности
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

// 2. CORS - настройка политики CORS с максимальной защитой
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],
  maxAge: 86400, // 24 часа
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

// 3. Rate Limiting - защита от DDoS и брутфорса
await app.register(rateLimit, {
  max: 100, // максимальное количество запросов
  timeWindow: "1 minute", // за период времени
  cache: 10000, // количество IP адресов для кеширования
  whitelist: ["127.0.0.1"], // белый список IP (опционально)
  redis: undefined, // можно подключить Redis для распределенного rate limiting
  skipOnError: false,
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
});

// 4. JWT - аутентификация и авторизация
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

// 5. PostgreSQL - подключение к базе данных
await app.register(postgres, {
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Проверка подключения к базе данных и создание таблиц
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

// Декоратор для проверки JWT токена
app.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// Типы для TypeScript
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Health check endpoint (публичный)
app.get("/health", async (_request, reply) => {
  try {
    // Проверяем подключение к БД
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
      user: request.user, // JWT payload доступен через request.user
    };
  }
);

// Endpoint для логина (выдача JWT токена)
app.post<{
  Body: { email: string; password: string };
}>("/api/login", async (request, reply) => {
  const { email, password } = request.body;

  try {
    const client = await app.pg.connect();
    
    // Получаем id, пароль, роль и имя из базы данных
    const result = await client.query(
      "SELECT id, password, role, first_name, last_name FROM users_new WHERE email = $1",
      [email]
    );

    client.release();

    // Проверяем, существует ли пользователь
    if (result.rows.length === 0) {
      reply.code(401).send({ error: "Аккаунта не существует" });
      return;
    }

    const { id, password: hashedPassword, role, first_name, last_name } = result.rows[0];

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (!isPasswordValid) {
      reply.code(401).send({ error: "Неверные данные входа" });
      return;
    }

    // Генерируем JWT токен (включаем id для последующих запросов)
    const token = app.jwt.sign({ id, email, role });

    return {
      token,
      user: {
        id,
        email,
        role,
        firstName: first_name,
        lastName: last_name,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`Login error: ${errorMessage}`);
    reply.code(500).send({ error: "Внутренняя ошибка сервера" });
  }
});

// ─── Student endpoints ────────────────────────────────────────────────────────

// GET /api/student/my-groups — активные записи текущего студента
app.get(
  "/api/student/my-groups",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; email: string; role: string };

    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           b.id,
           b.discipline,
           b.groups_count,
           b.program,
           CASE WHEN b.module IS NOT NULL THEN ARRAY[b.module] ELSE ARRAY[]::integer[] END AS modules,
           u.first_name,
           u.last_name,
           u.email AS teacher_email
         FROM bookings b
         JOIN users_new u ON b.teacher_id = u.id
         WHERE b.student_id = $1 AND b.active = true
         ORDER BY b.created_at DESC`,
        [user.id]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/student/search — доступные предложения от менеджеров
app.get(
  "/api/student/search",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           o.id,
           o.discipline,
           o.program,
           o.modules,
           o.total_groups,
           u.first_name,
           u.last_name,
           u.email AS teacher_email,
           (o.total_groups - COALESCE(SUM(b.groups_count), 0)) AS available_groups
         FROM offers o
         JOIN users_new u ON o.teacher_id = u.id
         LEFT JOIN bookings b
           ON b.teacher_id = o.teacher_id
          AND b.discipline = o.discipline
          AND b.active = true
         WHERE o.active = true
         GROUP BY o.id, u.id, u.first_name, u.last_name, u.email
         HAVING (o.total_groups - COALESCE(SUM(b.groups_count), 0)) > 0
         ORDER BY o.created_at DESC`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// POST /api/student/bookings — студент записывается на предложение
app.post<{
  Body: { offerId: number; groupsCount: number };
}>(
  "/api/student/bookings",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { id: number; email: string; role: string };

    if (user.role !== "student") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { offerId, groupsCount } = request.body;

    if (!offerId || !groupsCount || groupsCount < 1) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    const client = await app.pg.connect();
    try {
      // Получаем предложение и считаем доступные места
      const offerResult = await client.query(
        `SELECT
           o.teacher_id,
           o.discipline,
           o.program,
           (o.total_groups - COALESCE(SUM(b.groups_count), 0)) AS available_groups
         FROM offers o
         LEFT JOIN bookings b
           ON b.teacher_id = o.teacher_id
          AND b.discipline = o.discipline
          AND b.active = true
         WHERE o.id = $1 AND o.active = true
         GROUP BY o.id`,
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return reply.code(404).send({ error: "Предложение не найдено или неактивно" });
      }

      const offer = offerResult.rows[0];
      const available = Number(offer.available_groups);

      if (groupsCount > available) {
        return reply.code(409).send({
          error: `Недостаточно свободных мест. Доступно: ${available}`,
        });
      }

      // Создаём запись
      const insertResult = await client.query(
        `INSERT INTO bookings (student_id, teacher_id, discipline, groups_count, program, active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [user.id, offer.teacher_id, offer.discipline, groupsCount, offer.program]
      );

      return reply.code(201).send({ bookingId: insertResult.rows[0].id });
    } finally {
      client.release();
    }
  }
);

// ─── Teacher directory ────────────────────────────────────────────────────────

// GET /api/teachers — список всех преподавателей (для выпадающего списка)
app.get(
  "/api/teachers",
  { preHandler: [app.authenticate] },
  async (_request, _reply) => {
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT id, first_name, last_name, email
         FROM users_new
         WHERE role = 'teacher'
         ORDER BY last_name, first_name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// ─── Manager endpoints ────────────────────────────────────────────────────────

// GET /api/manager/offers — все активные предложения с ссылками
app.get(
  "/api/manager/offers",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== "manager") {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           o.id,
           o.discipline,
           o.faculty,
           o.program,
           o.total_groups,
           o.modules,
           u.id AS teacher_id,
           u.first_name,
           u.last_name,
           u.email AS teacher_email,
           m.first_name AS manager_first_name,
           m.last_name AS manager_last_name,
           COALESCE(
             json_agg(json_build_object('name', ol.name, 'url', ol.url))
               FILTER (WHERE ol.id IS NOT NULL),
             '[]'
           ) AS links
         FROM offers o
         JOIN users_new u ON o.teacher_id = u.id
         LEFT JOIN users_new m ON m.id = o.manager_id
         LEFT JOIN offer_links ol ON ol.offer_id = o.id
         WHERE o.active = true
         GROUP BY o.id, u.id, u.first_name, u.last_name, u.email, m.first_name, m.last_name
         ORDER BY o.created_at DESC`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// POST /api/manager/offers — создать новое предложение со ссылками
app.post<{
  Body: {
    teacherId: number;
    discipline: string;
    faculty: string;
    program: string;
    totalGroups: number;
    modules: number[];
    links: { name: string; url: string }[];
  };
}>(
  "/api/manager/offers",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== "manager") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { teacherId, discipline, faculty, program, totalGroups, modules, links } = request.body;

    if (!teacherId || !discipline || !program || !totalGroups || !modules?.length) {
      return reply.code(400).send({ error: "Некорректные данные запроса" });
    }

    const manager = request.user as { id: number };

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `INSERT INTO offers (teacher_id, discipline, faculty, program, total_groups, modules, manager_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [teacherId, discipline, faculty ?? "", program, totalGroups, modules, manager.id]
      );

      const offerId = result.rows[0].id;

      if (links && links.length > 0) {
        for (const link of links) {
          if (link.name && link.url) {
            await client.query(
              `INSERT INTO offer_links (offer_id, name, url) VALUES ($1, $2, $3)`,
              [offerId, link.name, link.url]
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

// ─── Teacher endpoints ────────────────────────────────────────────────────────

// GET /api/teacher/groups — все активные предложения для текущего преподавателя с бронированиями
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
           o.id,
           o.discipline,
           o.faculty,
           o.program,
           o.total_groups,
           o.modules,
           m.first_name AS manager_first_name,
           m.last_name  AS manager_last_name,
           (o.total_groups - COALESCE((
             SELECT SUM(b2.groups_count) FROM bookings b2
             WHERE b2.teacher_id = o.teacher_id
               AND b2.discipline = o.discipline
               AND b2.active = true
           ), 0)) AS available_groups,
           COALESCE((
             SELECT json_agg(json_build_object('name', ol.name, 'url', ol.url))
             FROM offer_links ol WHERE ol.offer_id = o.id
           ), '[]') AS links,
           COALESCE((
             SELECT json_agg(json_build_object(
               'booking_id', b.id,
               'groups_count', b.groups_count,
               'student_first_name', s.first_name,
               'student_last_name', s.last_name,
               'student_email', s.email
             ))
             FROM bookings b
             JOIN users_new s ON s.id = b.student_id
             WHERE b.teacher_id = o.teacher_id
               AND b.discipline = o.discipline
               AND b.active = true
           ), '[]') AS bookings
         FROM offers o
         LEFT JOIN users_new m ON m.id = o.manager_id
         WHERE o.teacher_id = $1 AND o.active = true
         ORDER BY o.created_at DESC`,
        [user.id]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// GET /api/manager/groups-stats — статистика групп по дисциплинам
app.get(
  "/api/manager/groups-stats",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== "manager") {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `SELECT
           o.discipline,
           SUM(o.total_groups) AS total_groups,
           SUM(o.total_groups - COALESCE(b.booked, 0)) AS groups_without_assistant
         FROM offers o
         LEFT JOIN (
           SELECT teacher_id, discipline, SUM(groups_count) AS booked
           FROM bookings
           WHERE active = true
           GROUP BY teacher_id, discipline
         ) b ON b.teacher_id = o.teacher_id AND b.discipline = o.discipline
         WHERE o.active = true
         GROUP BY o.discipline
         ORDER BY o.discipline`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
);

// DELETE /api/manager/offers/:id — деактивировать предложение
app.delete<{ Params: { id: string } }>(
  "/api/manager/offers/:id",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== "manager") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const offerId = parseInt(request.params.id, 10);
    if (isNaN(offerId)) {
      return reply.code(400).send({ error: "Некорректный id" });
    }

    const client = await app.pg.connect();
    try {
      const result = await client.query(
        `UPDATE offers SET active = false WHERE id = $1 RETURNING id`,
        [offerId]
      );
      if (result.rowCount === 0) {
        return reply.code(404).send({ error: "Предложение не найдено" });
      }
      return { success: true };
    } finally {
      client.release();
    }
  }
);

// Endpoint для выхода (logout)
app.post(
  "/api/logout",
  { preHandler: [app.authenticate] },
  async (request, _reply) => {
    try {
      // В случае JWT токенов, клиент должен удалить токен на своей стороне
      // Здесь мы можем добавить логирование выхода для аудита
      const user = request.user as { email?: string; role?: string };
      
      app.log.info(`User logged out: ${user.email || "unknown"}`);
      
      return {
        message: "Logged out successfully",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      app.log.error(`Logout error: ${errorMessage}`);
      // Даже при ошибке возвращаем успешный ответ, так как токен удаляется на клиенте
      return {
        message: "Logged out successfully",
      };
    }
  }
);

// Обработка ошибок
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const statusCode = (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") 
    ? error.statusCode 
    : 500;
  const validation = (error && typeof error === "object" && "validation" in error) 
    ? error.validation 
    : undefined;

  if (validation) {
    reply.code(400).send({
      error: "Validation Error",
      message: errorMessage,
      details: validation,
    });
    return;
  }

  if (statusCode === 401) {
    reply.code(401).send({
      error: "Unauthorized",
      message: errorMessage,
    });
    return;
  }

  reply.code(statusCode).send({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : errorMessage,
    ...(process.env.NODE_ENV !== "production" && errorStack && { stack: errorStack }),
  });
});

// Graceful shutdown
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

// Запуск сервера
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
