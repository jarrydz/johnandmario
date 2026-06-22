/**
 * John & Mario — phone-posting Worker.
 *
 * The mobile counterpart to scripts/img.mjs. An iOS Shortcut shares a photo to
 * this endpoint; the Worker does end to end what `jm` does on the Mac:
 *   1. authenticate the request (shared POST_TOKEN)
 *   2. read the JPEG body and its pixel dimensions
 *   3. upload the original to R2 under  new/<slug>.jpg
 *   4. caption it with Claude (same prompt as the archive)
 *   5. commit  src/content/posts/<slug>.md  to GitHub (authored as JZ)
 * The push triggers the existing Pages deploy — live in ~1–2 min.
 *
 * Design choice: publish-then-fix. No approval step on the phone; a wrong
 * caption is just a markdown file to edit later from the Mac. The Shortcut
 * resizes to ~1600px JPEG before sending, so there is no server-side image
 * processing here — the longest edge the site ever serves is 1600.
 *
 * POST /            body = JPEG bytes,  header: X-Post-Token: <POST_TOKEN>
 *   optional query: ?tags=a,b,c&source=Name&source_url=https://…
 * Returns JSON: { ok, slug, url, alt }.
 */

const MODEL = 'claude-haiku-4-5-20251001';

// Caption prompt — mirrors scripts/img.mjs (keep in sync).
const SYSTEM = `You caption images for a curated visual-inspiration archive (early-2010s Tumblr aesthetic spanning architecture, interiors, design, fashion, nature, travel, food, art and people). You produce two things: plain factual alt text for screen-reader accessibility, and an evocative description rich enough to use as a generative-image (Midjourney-style) prompt. Ground everything in what is visibly present — subject, setting, materials, light, colour palette, mood, composition, and visual style or medium. Be confident and sensory about the aesthetics. Never invent or transcribe brand names, logos, label text, identities, or place names — describe them generically (e.g. "a bottle of red wine", "a canvas holdall"). Write in British English (colour, grey, neutral tones). Do not begin with "image of" or "a photo of".`;

const USER = `Return ONLY a JSON object (no markdown) with keys:
"alt": one concise, plainly factual sentence (max ~125 characters) for screen readers — accurate, no flourish.
"description": one or two evocative sentences that could be fed to an image generator to recreate the scene — capture subject, setting, materials, light, colour palette, mood, composition, and visual style or medium (e.g. "35mm film", "architectural photography", "soft overcast light", "muted earth tones"). Sensory and atmospheric, but grounded in what is shown.
"tags": array of 6–12 short lowercase keywords (subjects, materials, style, palette, setting, mood).
Do not transcribe text, logos, or brand labels — describe them generically.`;

// ---- helpers --------------------------------------------------------------

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

// Base64-encode bytes in chunks (avoids call-stack limits on large buffers).
function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
const textToBase64 = (str) => toBase64(new TextEncoder().encode(str));

// Read width/height from a baseline or progressive JPEG by walking its markers
// to the Start-Of-Frame segment. Returns {width:0,height:0} if not found.
function jpegSize(buf) {
  const d = new DataView(buf);
  const len = d.byteLength;
  if (len < 4 || d.getUint16(0) !== 0xffd8) return { width: 0, height: 0 };
  let off = 2;
  while (off + 9 < len) {
    if (d.getUint8(off) !== 0xff) {
      off++;
      continue;
    }
    const marker = d.getUint8(off + 1);
    // SOF0..SOF15, excluding the non-frame markers C4 (DHT), C8 (JPG), CC (DAC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: d.getUint16(off + 5), width: d.getUint16(off + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      off += 2; // standalone markers carry no length
      continue;
    }
    off += 2 + d.getUint16(off + 2); // skip this segment
  }
  return { width: 0, height: 0 };
}

function newSlug() {
  const date = new Date().toISOString().slice(0, 10);
  const rand = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
  return { date, slug: `${date}-${hex}` };
}

function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('no JSON object in model response');
  return JSON.parse(text.slice(s, e + 1));
}

async function caption(env, b64) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
              { type: 'text', text: USER },
            ],
          },
          { role: 'assistant', content: '{' }, // prefill forces a JSON object
        ],
      }),
    });
    if (res.status === 429 || res.status === 500 || res.status === 529) {
      lastErr = new Error(`Anthropic ${res.status}`);
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    try {
      const parsed = extractJson('{' + data.content[0].text);
      return {
        alt: String(parsed.alt || '').trim(),
        description: String(parsed.description || '').trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
      };
    } catch (e) {
      lastErr = e; // malformed JSON — retry, the prefill usually self-corrects
      continue;
    }
  }
  throw lastErr || new Error('captioning failed');
}

function buildFrontmatter({ dateIso, r2Key, width, height, alt, description, tags, source, sourceUrl, jz }) {
  const lines = [
    '---',
    `date: ${JSON.stringify(dateIso)}`,
    'post_type: photo',
    jz ? 'jz: true' : null,
    `r2_key: ${JSON.stringify(r2Key)}`,
    width ? `image_width: ${width}` : null,
    height ? `image_height: ${height}` : null,
    `image_alt: ${JSON.stringify(alt)}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    source ? `source: ${JSON.stringify(source)}` : null,
    sourceUrl ? `source_url: ${JSON.stringify(sourceUrl)}` : null,
    '---',
    '',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

async function commitToGitHub(env, slug, contents) {
  const path = `src/content/posts/${slug}.md`;
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'johnandmario-post-worker',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: `Add post ${slug}`,
      content: textToBase64(contents),
      branch: env.GIT_BRANCH,
      committer: { name: env.AUTHOR_NAME, email: env.AUTHOR_EMAIL },
      author: { name: env.AUTHOR_NAME, email: env.AUTHOR_EMAIL },
    }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return path;
}

// ---- entrypoint -----------------------------------------------------------

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('John & Mario post endpoint. POST a JPEG with an X-Post-Token header.', {
        headers: { 'content-type': 'text/plain' },
      });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

    // Auth: constant-ish check against the shared secret.
    const token = request.headers.get('x-post-token') || '';
    if (!env.POST_TOKEN || token !== env.POST_TOKEN) return json({ ok: false, error: 'unauthorised' }, 401);

    try {
      const buf = await request.arrayBuffer();
      if (!buf || buf.byteLength < 100) return json({ ok: false, error: 'empty body' }, 400);
      const bytes = new Uint8Array(buf);

      const url = new URL(request.url);
      const extraTags = (url.searchParams.get('tags') || '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const source = url.searchParams.get('source') || null;
      const sourceUrl = url.searchParams.get('source_url') || null;
      const jz = ['1', 'true', 'yes'].includes((url.searchParams.get('jz') || '').toLowerCase());

      const { date, slug } = newSlug();
      const r2Key = `new/${slug}.jpg`;
      const { width, height } = jpegSize(buf);

      // Upload original to R2.
      await env.BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });

      // Caption (image already ≤1600px from the Shortcut).
      const cap = await caption(env, toBase64(bytes));
      const tags = [...new Set([...extraTags, ...cap.tags])];

      const dateIso = new Date().toISOString();
      const fm = buildFrontmatter({
        dateIso,
        r2Key,
        width,
        height,
        alt: cap.alt,
        description: cap.description,
        tags,
        source,
        sourceUrl,
        jz,
      });

      await commitToGitHub(env, slug, fm);

      return json({
        ok: true,
        slug,
        url: `https://jarrydz.github.io/johnandmario/posts/${slug}/`,
        alt: cap.alt,
      });
    } catch (e) {
      return json({ ok: false, error: String(e?.message || e) }, 500);
    }
  },
};
