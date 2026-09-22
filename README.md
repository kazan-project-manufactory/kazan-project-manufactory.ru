# kazan-project-manufactory.ru — статика

Сайт Казанской проектной мануфактуры на чистом HTML+CSS. Страницы собирает Hugo из исходников в приватном монорепо (`projects/kpm-site/hugo/`), сюда попадает готовый HTML — руками его не правят. Живёт на **lab.kazan-project-manufactory.ru** (GitHub Pages, закрыт от индексации) — это и рабочая версия сайта до переключения apex с Тильды, и полигон дизайн-экспериментов.

В корне — сам сайт, каждый эксперимент — отдельной папкой `exp/<slug>/` рядом. Эксперименты корень не трогают: по адресу `/` всегда чистая версия.

## Структура

- `index.html` — главная (верстка руками по экстракту Тильды)
- `<slug>/index.html` — 7 кейсов и `privacypolicy`
- шапка, подвал, логотип и секция с формой — общие, живут в шаблонах Hugo, а не в каждой странице
- `styles.css` — токены (`:root`), типографика, кнопки, карточки, секции, брейкпоинты 1600/1200/960/640/480/320 как у артбордов Тильды
- `assets/` — шрифты (Onest, ANS), картинки в webp (`assets/img/<slug>/`, `manifest.json` — соответствие tildacdn → локальный файл), логотип, иконки, og
- `tools/extract_zero.py` — парсер Zero Block из зеркала Тильды в JSON; `tools/images.py` — конвертация картинок; `tools/exp.py` — эксперименты
- `robots.txt`, `<meta name="robots" content="noindex">` на каждой странице, `CNAME`, `.nojekyll`
- `exp/` — дизайн-эксперименты: `exp/REGISTRY.md` (реестр), `exp/index.html` (список, генерируется), `exp/<slug>/` — копия страниц эксперимента; корень сайта эксперименты не трогают

## Снимок Тильды

Тег `tilda-snapshot-2026-09-16` — полное wget-зеркало прода на момент старта (папка `tilda/`, 58 МБ). Из `main` убрано, достать: `git checkout tilda-snapshot-2026-09-16 -- tilda extract`.

## Как править

HTML в этом репозитории — результат сборки. Правки идут в исходники Hugo (`projects/kpm-site/hugo/` в монорепо):

- текст и вёрстка страницы — `hugo/content/<slug>.html` (или `_index.html` для главной);
- шапка, подвал, логотип, форма — `hugo/layouts/`;
- собрать: `cd hugo && hugo` — готовый HTML ложится прямо в этот репозиторий, остаётся закоммитить и запушить;
- посмотреть локально: `cd hugo && hugo server`, либо `python3 -m http.server 8000` из корня сайта.

`styles.css`, `assets/`, `robots.txt`, `CNAME` и `exp/` Hugo не трогает — они правятся здесь напрямую.

## Эксперименты

Оригинал живёт в корне, каждый эксперимент — в своей папке: `python3 tools/exp.py new <slug>` копирует все страницы и `styles.css` в `exp/<slug>/` (ассеты общие, внутренние ссылки остаются внутри эксперимента, внизу страницы бейдж со ссылкой на оригинал). Правки — только внутри `exp/<slug>/`. Затем строка в `exp/REGISTRY.md` и `python3 tools/exp.py index`. После деплоя — тег `exp/<slug>` на коммит (`git tag -a exp/<slug> -m "…" && git push origin exp/<slug>`): постоянная точка «сайт + эксперимент», даже если папку потом уберут. Принятый эксперимент переносится в корень руками, папка остаётся как история.

## Деплой

Push в `main` — Pages пересобирает за 1–2 минуты. Push по SSH (`git@github.com:kazan-project-manufactory/kazan-project-manufactory.ru.git`); при таймауте SSH — тот же push по HTTPS-URL.

## Форма

Заявки уходят в функцию Yandex Cloud Functions (`projects/kpm-site/form-api/`), та отправляет письмо через Yandex Cloud Postbox. Скрипт формы — `assets/form.js`, разметка — в шаблоне Hugo.
