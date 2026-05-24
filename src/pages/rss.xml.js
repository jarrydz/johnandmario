import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { withBase } from '../utils';

export async function GET(context) {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // Full home URL including the `base` sub-path, e.g.
    // https://jarrydz.github.io/johnandmario/
    site: new URL(withBase('/'), context.site).href,
    items: posts.map((post) => ({
      title: post.data.title ?? `Post ${post.id}`,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      // Build an absolute URL so the base sub-path is always preserved,
      // regardless of how BASE_URL is normalised in this endpoint context.
      link: new URL(withBase(`/posts/${post.id}/`), context.site).href,
      categories: post.data.tags ?? [],
    })),
  });
}
