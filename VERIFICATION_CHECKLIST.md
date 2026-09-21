# SAM release verification checklist

## 1. Build
Run `npm install` then `npm run build`.

## 2. App smoke test
Confirm:
- Home page loads without runtime errors.
- New conversation resets chat.
- Messages persist after refresh.
- Voice button behaves safely when browser speech recognition is unavailable.

## 3. AI smoke test
GET `/api/openai` should return JSON with `ok: true`.
POST requires server-side AI credentials and must never expose the API key to the browser.

## 4. Deployment
Only verify against the SAM Vercel project. Never use CreateSoul/CreatorFlow as SAM's deployment target.

## 5. Resume artifacts
Update WORK_PACKAGE_4.10.47.md after each major milestone so work can resume from the file if a session stops.
