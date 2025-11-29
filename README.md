<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1oqHOzmTq3BJdtJyUGFj2JleUeixrQpNd

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. При первом открытии используйте общий пароль **3567**. Его можно изменить во вкладке «Владелец» → «Доступ для сотрудников».

## Deploy to Vercel

1. Push the repository to GitHub (already done for `HBTCFO/playroom-crm`).
2. In Vercel, import the repo, leave the default build command (`npm run build`) and output directory (`dist`).
3. (Optional) If решишь включить AI-поздравления, добавь `VITE_GEMINI_API_KEY` в Vercel → Project Settings → Environment Variables.
4. Trigger the first deployment; Vercel будет автоматически обновляться при каждом push в `main`.
