# Снимок сайта с Тильды — 2026-09-16

Полное зеркало kazan-project-manufactory.ru на момент старта переверстки. Тег `tilda-snapshot-2026-09-16`.

Как снималось:

```sh
wget -e robots=off -r -l 2 --wait=1 --random-wait \
  --user-agent="Mozilla/5.0 (Macintosh) Chrome/128" \
  --page-requisites --convert-links --adjust-extension --span-hosts \
  --domains=kazan-project-manufactory.ru,static.tildacdn.com,neo.tildacdn.com,ws.tildacdn.com \
  -P tilda/ https://kazan-project-manufactory.ru/
```

Тильда отдаёт 403 при быстрой рекурсии — нужны пауза и браузерный UA. Из html вырезан счётчик Яндекс.Метрики (98750987), чтобы копия не слала статистику в прод. Страницы: `kazan-project-manufactory.ru/index.html` и 8 внутренних (`*.html`), ассеты — в `static.tildacdn.com/`.
