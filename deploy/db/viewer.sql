-- Роль viewer — только чтение схемы dc_new (для DataLens и аналитики).
-- Запуск: psql -v pw=<пароль> -v db=<база> -f viewer.sql   (выполняется 03_viewer.sh при первом запуске)

CREATE ROLE viewer LOGIN PASSWORD :'pw' NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 10;
ALTER ROLE viewer SET default_transaction_read_only = on;

GRANT CONNECT ON DATABASE :"db" TO viewer;
GRANT USAGE ON SCHEMA dc_new TO viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA dc_new TO viewer;

-- Хэши паролей не показываем
REVOKE SELECT ON dc_new.users FROM viewer;
GRANT SELECT (id, email, first_name, last_name, middle_name, role, created_at) ON dc_new.users TO viewer;

-- Таблицы, которые появятся в будущем, тоже доступны на чтение
ALTER DEFAULT PRIVILEGES IN SCHEMA dc_new GRANT SELECT ON TABLES TO viewer;
