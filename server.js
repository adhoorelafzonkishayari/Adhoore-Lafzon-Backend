import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors()); // Restrict allowed origins before production deployment.
app.use(express.json({ limit: "32kb" }));
const outDir = path.join(__dirname, "outputs");
const bgPath = path.join(__dirname, "assets", "background.jpg");
fs.mkdirSync(outDir, { recursive: true });
app.use("/outputs", express.static(outDir, { maxAge: "1h" }));

const samples = {
  Sad: "Kabhi kabhi khamoshi bhi bahut kuch keh jaati hai, jo baat lafzon se na ho, woh aankhon mein reh jaati hai.",
  Romantic: "Teri muskurahat meri pehchaan ban gayi, teri har baat meri jaan ban gayi, tum mile to zindagi khoobsurat lagne lagi.",
  Bewafai: "Jis par bharosa tha wahi ajnabi ban gaya, dil ka sabse kareeb hi doori ki wajah ban gaya.",
  Dard: "Dard ko muskurahat ke peeche chhupa liya, humne apne aansuon ko khud hi samjha liya.",
  Mohabbat: "Mohabbat sirf kehne ka naam nahi, kisi ki khushi mein apni khushi dhoondhna bhi hai.",
  Yaadein: "Kuch yaadein waqt ke saath dhundhli nahi hoti, woh khamoshi mein bhi dil se baat karti hain.",
  Akelapan: "Bheed mein bhi kabhi tanha reh jaate hain, kuch sawaal khud se hi keh jaate hain.",
  Zindagi: "Zindagi har mod par naya sabaq sikhaati hai, girne ke baad uthna hi jeena sikhaati hai.",
  Motivation: "Rukna nahi, chahe raasta mushkil ho, har chhota kadam bhi manzil ke kareeb le jaata hai."
};

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args);
    let stderr = "";
    child.stderr.on("data", d => stderr += d.toString());
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() :
      reject(new Error("FFmpeg failed: " + stderr.slice(-1800))));
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/generate", async (req, res) => {
  try {
    const category = String(req.body?.category || "Sad");
    const topic = String(req.body?.topic || "").trim().slice(0, 120);
    const shayari = samples[category] || samples.Sad;
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
      return res.status(503).json({ error: "Backend mein ElevenLabs API key aur voice ID configure nahi hain." });
    }
    if (!fs.existsSync(bgPath)) {
      return res.status(503).json({ error: "backend/assets/background.jpg missing hai. Licensed background image add karein." });
    }

    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID)}`;
    const tts = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: shayari,
        model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.75 }
      })
    });
    if (!tts.ok) {
      const detail = await tts.text();
      return res.status(502).json({ error: "ElevenLabs request failed: " + detail.slice(0, 400) });
    }

    const id = crypto.randomUUID();
    const audioPath = path.join(outDir, `${id}.mp3`);
    const videoPath = path.join(outDir, `${id}.mp4`);
    fs.writeFileSync(audioPath, Buffer.from(await tts.arrayBuffer()));

    // Requires FFmpeg and a background.jpg. Adds readable caption and brand text.
    const safeText = shayari.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/%/g, "\\%");
    const filter = [
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      "drawbox=x=0:y=520:w=1080:h=760:color=black@0.45:t=fill",
      `drawtext=text='${safeText}':fontcolor=white:fontsize=48:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:box=0`,
      "drawtext=text='Adhoore Lafzon Ki Shayari':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h-180"
    ].join(",");
    await runFfmpeg([
      "-y", "-loop", "1", "-i", bgPath, "-i", audioPath,
      "-vf", filter, "-c:v", "libx264", "-tune", "stillimage",
      "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p",
      "-shortest", "-movflags", "+faststart", videoPath
    ]);

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    if (!base) {
      return res.status(500).json({ error: "PUBLIC_BASE_URL set nahi hai; server ko public HTTPS URL par deploy karein." });
    }
    res.json({
      category, topic,
      shayari,
      videoUrl: `${base}/outputs/${id}.mp4`,
      note: "Video generated. Social media auto-publishing is not configured in this starter."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed: " + String(err.message || err).slice(0, 500) });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Backend listening on ${port}`));
