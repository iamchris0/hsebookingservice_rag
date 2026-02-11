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

// Проверка подключения к базе данных
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
app.get("/health", async (request, reply) => {
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

// Пример защищенного endpoint (требует JWT токен)
app.get(
  "/api/protected",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
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
    
    // Получаем пароль и роль из базы данных
    const result = await client.query(
      "SELECT password, role FROM users_new WHERE email = $1",
      [email]
    );
    
    client.release();

    // Проверяем, существует ли пользователь
    if (result.rows.length === 0) {
      reply.code(401).send({ error: "Аккаунта не существует" });
      return;
    }

    const { password: hashedPassword, role } = result.rows[0];

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (!isPasswordValid) {
      reply.code(401).send({ error: "Неверные данные входа" });
      return;
    }

    // Генерируем JWT токен
    const token = app.jwt.sign({
      email: email,
      role: role,
    });

    return {
      token,
      user: {
        email: email,
        role: role,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    app.log.error(`Login error: ${errorMessage}`);
    reply.code(500).send({ error: "Внутренняя ошибка сервера" });
  }
});

// Endpoint для выхода (logout)
app.post(
  "/api/logout",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
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
app.setErrorHandler((error, request, reply) => {
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
