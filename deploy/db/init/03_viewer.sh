#!/bin/sh
# Создаёт роль viewer при первом запуске, если задан VIEWER_PASSWORD.
if [ -n "$VIEWER_PASSWORD" ]; then
	psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
		-v pw="$VIEWER_PASSWORD" -v db="$POSTGRES_DB" -f /etc/postgresql/viewer.sql
fi
