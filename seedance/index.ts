/**
 * Higgsfield Seedance 2.5 — text-to-video example (SERVER-SIDE ONLY).
 *
 * Never import this file from browser/client code: it uses HF_CREDENTIALS,
 * which must stay server-side and must never be logged, printed, or committed.
 *
 * Run locally (after adding your key to .env.local, never in chat):
 *   npm run seedance
 *
 * This makes a billable generation request.
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
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  },
);

if (result.status === "completed" && result.video?.url) {
  console.log(result.video.url);
} else if (result.status === "failed") {
  console.error(
    `Video generation failed (request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
} else if (result.status === "nsfw") {
  console.error(
    `Video generation was moderated (request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
} else {
  console.error(
    `Video generation did not complete (status: ${result.status}, request_id: ${result.request_id}). No video was produced.`,
  );
  process.exit(1);
}
