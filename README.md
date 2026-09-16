# kazan-project-manufactory.ru — статика

Полигон дизайн-экспериментов для сайта Казанской проектной мануфактуры — **lab.kazan-project-manufactory.ru** (GitHub Pages, закрыт от индексации).

В корне лежит копия боевого сайта, каждый эксперимент — в `exp/<slug>/` рядом. Сам боевой сайт живёт в отдельном репо `kazan-project-manufactory/kazan-project-manufactory.ru` (пока на **new.kazan-project-manufactory.ru**, до переключения apex с Тильды) — здесь он подключён как remote `upstream` и подтягивается командой `python3 tools/exp.py sync`.

## Структура

- `index.html` — главная (верстка руками по экстракту Тильды)
- `<slug>/index.html` — 7 кейсов и `privacypolicy` — генерируются `tools/build_page.py` из `extract/<slug>.json`
- `styles.css` — токены (`:root`), типографика, кнопки, карточки, секции, брейкпоинты 1600/1200/960/640/480/320 как у артбордов Тильды
- `assets/` — шрифты (Onest, ANS), картинки в webp (`assets/img/<slug>/`, `manifest.json` — соответствие tildacdn → локальный файл), логотип, иконки, og
- `tools/extract_zero.py` — парсер Zero Block из зеркала Тильды в JSON; `tools/images.py` — конвертация картинок
- `robots.txt`, `<meta name="robots" content="noindex">` на каждой странице, `CNAME`, `.nojekyll`
- `exp/` — дизайн-эксперименты: `exp/REGISTRY.md` (реестр), `exp/index.html` (список, генерируется), `exp/<slug>/` — копия страниц эксперимента; корень сайта эксперименты не трогают

## Снимок Тильды

Тег `tilda-snapshot-2026-09-16` — полное wget-зеркало прода на момент старта (папка `tilda/`, 58 МБ). Из `main` убрано, достать: `git checkout tilda-snapshot-2026-09-16 -- tilda extract`.

## Как править

- Главная — руками в `index.html`.
- Кейс — поправить `extract/<slug>.json` (из тега) или сам `<slug>/index.html`; пересобрать: `git checkout tilda-snapshot-2026-09-16 -- extract && python3 tools/build_page.py --all`.
- Проверка локально: `python3 -m http.server 8000` из корня (пути к ассетам абсолютные, `/assets/...`).

## Эксперименты

Перед новым экспериментом — `python3 tools/exp.py sync`: подтягивает корень из прод-репо (`upstream/main`), не трогая `exp/`, `tools/`, README и CNAME. Это не merge: прод у себя удалил `exp/` и `tools/exp.py`, и merge затёр бы эксперименты.

Дальше оригинал в корне, каждый эксперимент — в своей папке: `python3 tools/exp.py new <slug>` копирует все страницы и `styles.css` в `exp/<slug>/` (ассеты общие, внутренние ссылки остаются внутри эксперимента, внизу страницы бейдж со ссылкой на оригинал). Правки — только внутри `exp/<slug>/`. Затем строка в `exp/REGISTRY.md` и `python3 tools/exp.py index`. После деплоя — тег `exp/<slug>` на коммит (`git tag -a exp/<slug> -m "…" && git push origin exp/<slug>`): постоянная точка «сайт + эксперимент», даже если папку потом уберут. Принятый эксперимент переносится в корень руками, папка остаётся как история.

## Деплой

Push в `main` — Pages пересобирает за 1–2 минуты. Push по SSH (`git@github.com:kazan-project-manufactory/kazan-project-manufactory.ru.git`); при таймауте SSH — тот же push по HTTPS-URL.

## Форма

На lab бэкенда нет: кнопка «Отправить» открывает письмо на alex@kazan-project-manufactory.ru с заполненными полями. Перед переключением apex — подключить реальную отправку.
