# Signal Distance — Play (WebGL)

Браузерная версия эпизода **«Сигнал на расстоянии»** (BCI × ТРИЗ).

## Играть

После первой WebGL-сборки игра будет здесь:

**https://mahawairochana989.github.io/SignalDistance-Play/**

Пока сборки нет — на странице показано «ожидание Build».

## Для разработчика

Точные шаги сборки в Unity: см. [UNITY_WEBGL_STEPS.md](UNITY_WEBGL_STEPS.md).

Исходники Unity лежат в **приватном** репозитории  
`https://github.com/mahawairochana989/SignalDistance-TRIZ`  
(сюда публикуется только папка WebGL Build — без полного проекта).

## После сборки

Скопируй **всё содержимое** папки WebGL Build в корень этого репозитория
(должны появиться `index.html`, `Build/`, `TemplateData/`), затем:

```powershell
cd C:\Users\polina\Desktop\BCI\SignalDistance-Play
git add -A
git commit -m "Publish WebGL build"
git push
```

Через 1–2 минуты обнови ссылку Pages выше.
