# Adhoore Lafzon Ki Shayari — starter project

Yeh ek **starter project** hai, final production app nahi. Ismein:
- Android app ka full basic interface
- Shayari categories aur topic input
- Backend ko request bhejne ka code
- ElevenLabs se audio generate karne ka backend endpoint
- FFmpeg ke zariye MP4 banane ka backend endpoint
- API keys server environment mein rakhne ka pattern

## Zaroori sach
1. Sirf APK se automatic Instagram/YouTube/Facebook publishing enable nahi hoti. Har platform ki OAuth authorization, API app setup aur permissions alag se chahiye. Is starter mein social publishing **abhi implement nahi** hai.
2. AI shayari generation ke liye LLM provider/API add karna hoga; abhi category-based sample shayari use hoti hai.
3. MP4 endpoint ko chalane ke liye server par `ffmpeg` aur `background.jpg` file honi chahiye.
4. ElevenLabs API key ko Android code ya public GitHub mein kabhi mat rakhein.
5. Yeh project aapke current GitHub repo ke exact Gradle/workflow configuration se verify nahi kiya gaya. Build/test zaroori hai.

## Project files
- `android-app/` — Android Studio/Gradle app
- `backend/` — Node.js Express backend

## Backend setup
Node.js 20+ aur FFmpeg install karein.
```bash
cd backend
cp .env.example .env
# .env mein values fill karein
npm install
npm start
```
`.env` mein:
- `ELEVENLABS_API_KEY`: apni private key
- `ELEVENLABS_VOICE_ID`: apni voice ID
- `PORT`: default 3000
- `PUBLIC_BASE_URL`: backend ka HTTPS URL, jaise https://your-server.example

`background.jpg` ko `backend/assets/background.jpg` mein rakhein. Yeh aapki licensed image honi chahiye.

## Android app setup
`android-app/` ko Android Studio mein open karein, ya iske files ko apne repo mein sahi path par copy karein.
`ApiConfig.java` mein `BASE_URL` ko apne deployed HTTPS backend URL se replace karein. Android ke liye `localhost` ka matlab phone hota hai, server nahi.

## Test endpoint
```bash
curl -X POST https://YOUR_BACKEND/api/generate \
  -H "Content-Type: application/json" \
  -d '{"category":"Sad","topic":"yaad","publish":false}'
```
Endpoint JSON mein generated shayari aur MP4 URL deta hai.

## Production checklist
- HTTPS deployment
- Authentication on backend (currently basic starter only; add before public deployment)
- Rate limiting, request limits, abuse prevention
- Add an actual AI text-generation provider if desired
- Implement OAuth/token storage and upload endpoints separately for each social platform
- Test API quotas, content rights, music licenses and platform policies
