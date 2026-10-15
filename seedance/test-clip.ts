/**
 * Higgsfield Seedance 2.5 — clip de prueba barato (SERVER-SIDE ONLY).
 *
 * Clip corto para validar estilo y tonos antes de gastar en uno largo.
 * Escena limpia SIN texto: los textos se montan después en HTML.
 * Costo aproximado: ~$1.96 por los 5 s en 720p (según cobro anterior observado).
 *
 * Never import this file from browser/client code. Credentials stay server-side.
 *
 * Run locally (billable):
 *   npm run seedance:test
 */
import { config, higgsfield } from "@higgsfield/client/v2";

const credentials = process.env.HF_CREDENTIALS;
if (!credentials) {
  console.error(
    "Missing HF_CREDENTIALS. Add it locally to .env.local as key-id:key-secret, then re-run. " +
      "The key is loaded at runtime and is never printed.",
  );
  process.exit(1);
}

config({ credentials });

const result = await higgsfield.subscribe(
  "bytedance/seedance-2.5/text-to-video",
  {
    input: {
      prompt:
        "Overhead close-up of colorful gummy candies resting on a soft lilac surface, subtle gentle motion, soft studio light, clean minimal composition, no text, no watermark",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
      output_format: "mp4",
      generate_audio: false,
    },
    withPolling: true,
  },
);

if (result.status === "completed" && result.video?.url) {
  console.log(result.video.url);
} else if (result.status === "failed") {
  console.error(
    `Test clip generation failed (request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
} else if (result.status === "nsfw") {
  console.error(
    `Test clip generation was moderated (request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
} else {
  console.error(
    `Test clip generation did not complete (status: ${result.status}, request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
}
