# PlayRoom CRM

CRM для детской игровой комнаты на React + Vite + TypeScript + Firebase Firestore.

## Локальный запуск

1. Установите зависимости: `npm install`
2. Создайте `.env.local` на основе `.env.example`
3. Запустите проект: `npm run dev`

## Обязательные env-переменные

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_REQUIRE_FIREBASE_AUTH` (`true` для прода)
- `VITE_OWNER_PASSWORD`
- `VITE_DEFAULT_STAFF_PASSWORD`

## Безопасный деплой в Vercel

1. Добавьте все `VITE_*` переменные в Vercel Project Settings -> Environment Variables.
2. В Firebase Authentication включите метод `Email/Password` и создайте учетные записи сотрудников.
3. Убедитесь, что ключ Firebase уже ротирован (старый ключ из репозитория считать скомпрометированным).
4. Задеплойте с командой сборки `npm run build` и output directory `dist`.

## Важно по данным

- Приложение больше не создает `settings/config` автоматически при удалении.
- При отсутствии `settings/config` показывается экран восстановления:
  - импорт JSON-бэкапа;
  - явная инициализация дефолтов.
- Экспорт/импорт настроек доступен во вкладке владельца.
