#!/bin/sh
# Одноразовая настройка доступа к Яндекс Диску (WebDAV + пароль приложения).
# Запуск (интерактивно, с терминалом):
#   docker compose exec backup sh /usr/local/bin/setup-yandex.sh
# Пароль приложения создаётся на id.yandex.ru → Безопасность → Пароли приложений → «Файлы» (WebDAV).
set -eu

printf 'Логин Яндекса (без @yandex.ru): '
read -r login
printf 'Пароль приложения (ввод скрыт): '
stty -echo
read -r pass
stty echo
echo

obscured=$(printf '%s' "$pass" | rclone obscure -)
rclone config create yadisk webdav url=https://webdav.yandex.ru vendor=other \
	user="$login" pass="$obscured" --no-obscure >/dev/null

rclone mkdir "yadisk:$YADISK_DIR"
echo "Готово: доступ к Диску работает, папка $YADISK_DIR создана."
