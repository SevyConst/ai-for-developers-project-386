#!/bin/sh
# Вся цепочка генерации одной командой:
#   контракт (TypeSpec) -> contract/openapi.yaml
#   -> клиент Orval во frontend/src/api/generated
#   -> серверные интерфейсы и DTO бэкенда в backend/target/generated-sources.
#
# Запуск из любого каталога: ./scripts/generate.sh
# Зависимости скрипт не ставит: перед первым запуском выполните npm ci в contract/ и frontend/.
# Сборка от этого скрипта не зависит (клиент генерируют pre*-хуки npm, интерфейсы - фаза generate-sources);
# скрипт нужен разработчику, чтобы после правки main.tsp одним вызовом обновить всё.
#
# Звенья идут подряд; первая ошибка останавливает цепочку, код выхода - код упавшего звена.

set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)

missing=""
[ -x "$ROOT/contract/node_modules/.bin/tsp" ] || missing="$missing contract/"
[ -x "$ROOT/frontend/node_modules/.bin/orval" ] || missing="$missing frontend/"
if [ -n "$missing" ]; then
	echo "ОШИБКА: не установлены зависимости Node в:$missing" >&2
	echo "Выполните npm ci в contract/ и frontend/ и запустите скрипт снова:" >&2
	echo "  (cd contract && npm ci) && (cd frontend && npm ci)" >&2
	exit 1
fi

# step НОМЕР НАЗВАНИЕ КАТАЛОГ КОМАНДА...
step() {
	num=$1
	title=$2
	dir=$3
	shift 3
	echo ""
	echo "==> [$num/3] $title"
	echo "    ($dir/: $*)"
	rc=0
	(cd "$ROOT/$dir" && "$@") || rc=$?
	if [ "$rc" -ne 0 ]; then
		echo "" >&2
		# Фигурные скобки обязательны: после $title идёт многобайтная «»», sh принимает её за часть имени переменной
		echo "ОШИБКА: упало звено ${num}/3 «${title}» (код выхода ${rc}). Цепочка остановлена." >&2
		exit "$rc"
	fi
}

step 1 "контракт: tsp compile -> contract/openapi.yaml" contract npm run compile
step 2 "фронтенд: клиент Orval -> frontend/src/api/generated" frontend npm run generate:api
step 3 "бэкенд: интерфейсы и DTO -> backend/target/generated-sources" backend ./mvnw -B generate-sources -Dskip.installnodenpm -Dskip.npm

echo ""
echo "Готово: все 3 звена цепочки выполнены."
