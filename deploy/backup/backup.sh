#!/bin/sh
# Еженедельная выгрузка: zip с CSV всех таблиц схемы dc_new + полный дамп (.dump).
# Архив кладётся в /backups (храним последние BACKUP_KEEP) и, если настроен
# remote "yadisk" (см. setup-yandex.sh), копируется на Яндекс Диск.
# Ручной запуск:  docker compose exec backup sh /usr/local/bin/backup.sh
set -eu

SCHEMA=dc_new
stamp=$(date +%Y-%m-%d_%H%M)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

pg_dump -Fc -f "$work/${PGDATABASE}.dump"

for table in $(psql -Atc "select table_name from information_schema.tables
                          where table_schema = '$SCHEMA' and table_type = 'BASE TABLE'
                          order by table_name"); do
	# Хэши паролей в CSV не выгружаем — они остаются только в .dump.
	cols=$(psql -Atc "select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
	                  from information_schema.columns
	                  where table_schema = '$SCHEMA' and table_name = '$table'
	                    and column_name <> 'password_hash'")
	# BOM, чтобы Excel правильно показал кириллицу.
	printf '\357\273\277' > "$work/$table.csv"
	psql -Atc "\copy (select $cols from $SCHEMA.$table) to stdout with csv header" >> "$work/$table.csv"
done

archive="/backups/${PGDATABASE}_${stamp}.zip"
(cd "$work" && zip -q "$archive.tmp" ./*)
mv "$archive.tmp" "$archive"
echo "[backup] $(date '+%F %T') создан $archive ($(du -h "$archive" | cut -f1))"

ls -1t /backups/*.zip | tail -n +"$((BACKUP_KEEP + 1))" | while read -r old; do
	rm -f "$old"
	echo "[backup] удалён старый $old"
done

if rclone listremotes 2>/dev/null | grep -q '^yadisk:$'; then
	rclone copy "$archive" "yadisk:$YADISK_DIR"
	rclone delete "yadisk:$YADISK_DIR" --min-age "${YADISK_KEEP_DAYS}d" --include "*.zip"
	echo "[backup] загружен на Яндекс Диск: $YADISK_DIR/$(basename "$archive")"
else
	echo "[backup] Яндекс Диск не настроен — архив только на сервере"
fi
