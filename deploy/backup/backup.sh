#!/bin/sh
# Дамп базы в /backups и удаление старых копий (оставляем последние BACKUP_KEEP).
# Ручной запуск:  docker compose exec backup sh /usr/local/bin/backup.sh
set -eu

file="/backups/${PGDATABASE}_$(date +%Y-%m-%d_%H%M).dump"

pg_dump -Fc -f "$file.tmp"
mv "$file.tmp" "$file"
echo "[backup] $(date '+%F %T') создан $file ($(du -h "$file" | cut -f1))"

ls -1t /backups/*.dump | tail -n +"$((BACKUP_KEEP + 1))" | while read -r old; do
	rm -f "$old"
	echo "[backup] удалён старый $old"
done
