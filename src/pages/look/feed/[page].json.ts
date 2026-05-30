import type { APIRoute, GetStaticPaths } from 'astro';
import { getLookItems, lookPageCount, LOOK_CHUNK } from '../../../lib/lookFeed';

// Prerendered, on-demand chunks for the Look infinite scroll. Each path emits
// a small static JSON file (e.g. /look/feed/2.json) that the client fetches as
// the reader nears the bottom of the page. Page 1 is also emitted, but the
// index page already inlines it as a bootstrap so the client starts at page 2.
export const getStaticPaths = (async () => {
  const items = await getLookItems();
  const pages = lookPageCount(items.length);
  return Array.from({ length: pages }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const items = await getLookItems();
  const last = lookPageCount(items.length);
  const page = Number(params.page);
  const start = (page - 1) * LOOK_CHUNK;
  const slice = items.slice(start, start + LOOK_CHUNK);

  return new Response(JSON.stringify({ page, last, items: slice }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
