import type { APIRoute, GetStaticPaths } from 'astro';
import { getLookItems, lookPageCount, LOOK_CHUNK } from '../../../../lib/lookFeed';

// Prerendered chunks for the /look?jz filter (photos JZ took). Identical to the
// main feed, but seeded from getLookItems({ jz: true }). The client fetches
// /look/feed/jz/<n>.json while scrolling the filtered view.
export const getStaticPaths = (async () => {
  const items = await getLookItems({ jz: true });
  const pages = lookPageCount(items.length);
  return Array.from({ length: pages }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const items = await getLookItems({ jz: true });
  const last = lookPageCount(items.length);
  const page = Number(params.page);
  const start = (page - 1) * LOOK_CHUNK;
  const slice = items.slice(start, start + LOOK_CHUNK);

  return new Response(JSON.stringify({ page, last, items: slice }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
