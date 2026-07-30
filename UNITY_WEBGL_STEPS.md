# Точные шаги: WebGL-сборка в Unity 6

Проект: **Signal Distance** · Unity **6000.4.6f1** (или 6000.4.x / 6000.3.x).

Цель: получить папку Build и выложить её в публичный репозиторий  
`SignalDistance-Play`, чтобы игра открывалась по ссылке  
https://mahawairochana989.github.io/SignalDistance-Play/

---

## 0. Подготовка

1. Открой **приватный** проект в Unity Hub:
   - клон `SignalDistance-TRIZ`, **или**
   - локальная папка Unity-проекта (та, из которой делали ZIP).
2. Дождись импорта пакетов (включая `net.gree.unity-webview`, если тянется).
3. Меню: **BCI TRIZ → Setup Scenes And Build Settings**  
   (если пункта нет — **BCI TRIZ → ▶ Открыть Bootstrap и Play**, потом вернись к Build).
4. Убедись, что в **File → Build Settings** в списке Scenes есть:
   - `Bootstrap`
   - `MainMenu`
   - `ClinicCorridor`
   - `PatientRoom`
   - `AssemblyBay`
   - `SignalLab`
   - `Debrief`  
   и сцена **Bootstrap** стоит **первой** (индекс 0).

---

## 1. Переключи платформу на WebGL

1. **File → Build Settings** (или **File → Build Profiles** в Unity 6).
2. Выбери платформу **WebGL**.
3. Нажми **Switch Platform** и дождись переключения (может занять несколько минут).

---

## 2. Настройки Player (обязательно)

**Edit → Project Settings → Player → вкладка WebGL**

Рекомендуемые значения:

| Параметр | Значение |
|---|---|
| **Resolution and Presentation → Default Canvas Width / Height** | 1280 × 720 (или 1920 × 1080) |
| **WebGL Template** | Default (или Minimal) |
| **Publishing Settings → Compression Format** | **Gzip** (удобнее для GitHub Pages) или **Disabled**, если будут проблемы с декодированием |
| **Publishing Settings → Decompression Fallback** | ✅ включить (если Compression = Gzip/Brotli) |
| **Other Settings → Color Space** | оставь как в проекте (обычно Linear) |
| **Other Settings → Managed Stripping Level** | Minimal или Low (на старте безопаснее) |
| **Publishing Settings → Name Files As Hashes** | можно выключить для простоты деплоя |

Дополнительно полезно:

- **Edit → Project Settings → Quality** — для WebGL часто достаточно Medium.
- В **Player → WebGL → Publishing Settings** не включай Memory Growth / огромный Initial Memory без нужды (старт 256–512 MB обычно ок).

---

## 3. Что может не работать в WebGL (ожидаемо)

- Встроенный **unity-webview** часто **не работает** в браузере так же, как в Editor/Standalone.  
  Экраны симуляций должны открывать **fallback** (внешняя вкладка / fullscreen HTML).  
  Для онлайна лучше заранее сменить URL симуляций с `http://localhost:8090` на  
  `https://mahawairochana989.github.io/BCI/bci-term-sims/`.
- Очень большие видео / аудио — дольше грузятся; первая загрузка страницы может быть тяжёлой.
- На телефоне WebGL FPS часто слабый; основная цель — **ПК в браузере**.

Перед сборкой (по желанию): в коде/`WebSimScreenStation` замени  
`http://localhost:8090` → публичный URL симуляций выше, сохрани, дождись recompile.

---

## 4. Сборка

1. **File → Build Settings**.
2. Platform = **WebGL**.
3. Нажми **Build** (не Build And Run, если хочешь сразу правильную папку).
4. Создай/выбери папку, например:

```text
C:\Users\polina\Desktop\BCI\SignalDistance_WebGL_Build
```

5. Дождись конца сборки (часто 5–30+ минут).

В папке Build должны появиться примерно:

```text
index.html
Build/
  SignalDistance_WebGL_Build.data[.gz]
  SignalDistance_WebGL_Build.framework.js[.gz]
  SignalDistance_WebGL_Build.loader.js
  SignalDistance_WebGL_Build.wasm[.gz]
TemplateData/
  ...
```

Имена файлов зависят от имени папки Build.

---

## 5. Локальная проверка перед GitHub

В PowerShell:

```powershell
cd C:\Users\polina\Desktop\BCI\SignalDistance_WebGL_Build
python -m http.server 8088
```

Открой: http://localhost:8088/

- Должен загрузиться Unity loader и сцена Bootstrap / меню.
- Если чёрный экран: смотри Console браузера (F12) — часто Compression / CORS / не тот путь.

> Не открывай `index.html` двойным кликом (`file://`) — WebGL обычно ломается. Нужен локальный HTTP-сервер.

---

## 6. Выкладка на GitHub Pages (этот репозиторий)

1. Склонируй (если ещё нет) публичный репо:

```powershell
cd C:\Users\polina\Desktop\BCI
git clone https://github.com/mahawairochana989/SignalDistance-Play.git
```

2. **Скопируй все файлы** из папки WebGL Build **в корень** `SignalDistance-Play`  
   (чтобы `index.html` лежал рядом с `README.md`, а не во вложенной папке).

3. Сохрани служебные файлы репозитория:
   - `README.md`
   - `UNITY_WEBGL_STEPS.md`
   - `.nojekyll`  ← обязательно (иначе Pages может сломать пути)

4. Закоммить и запушь:

```powershell
cd C:\Users\polina\Desktop\BCI\SignalDistance-Play
git add -A
git status
git commit -m "Publish WebGL build of Signal Distance"
git push
```

5. Подожди 1–3 минуты и открой:

**https://mahawairochana989.github.io/SignalDistance-Play/**

Если 404: **Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save**.

---

## 7. Быстрый чеклист

- [ ] Unity 6000.4.x, проект открывается
- [ ] Scenes в Build Settings, Bootstrap = 0
- [ ] Platform = WebGL, Switch Platform done
- [ ] Compression Gzip + Decompression Fallback **или** Compression Disabled
- [ ] Build в отдельную папку
- [ ] Проверка через `python -m http.server`
- [ ] Файлы Build скопированы в корень `SignalDistance-Play`
- [ ] Есть `.nojekyll`
- [ ] `git push` → ссылка Pages открывает игру

---

## Обновление игры позже

1. Снова Build в Unity (WebGL).
2. Замени файлы в `SignalDistance-Play`.
3. `git add -A && git commit -m "Update WebGL build" && git push`.
