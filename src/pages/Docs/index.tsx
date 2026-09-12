import { lazy, Suspense } from 'react';
import { useParams, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MDXProvider } from '@mdx-js/react';

const docs = import.meta.glob('/src/docs/**/*.mdx');

// Create a map of lazy components once, outside the component to avoid re-creation on render
const lazyDocs = Object.fromEntries(
  Object.entries(docs).map(([path, loader]) => {
    // Transform "/src/docs/getting-started.mdx" -> "getting-started"
    const key = path.replace(/^\/src\/docs\//, '').replace(/\.mdx$/, '');
    return [
      key,
      lazy(loader as () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>),
    ];
  })
);

/**
 * Custom link component for MDX to handle SPA navigation.
 * Translates Markdown-style links (.mdx) into app routes.
 */
function MdxLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    // Skip external links, fragments, and empty hrefs
    const isInternal =
      href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#');
    if (isInternal) {
      e.preventDefault();

      // Resolve relative path against current location's directory
      const pathParts = location.pathname.split('/');
      // If the last part is empty (trailing slash), remove it to find the true parent
      if (pathParts[pathParts.length - 1] === '') pathParts.pop();
      // Remove the current page to get the directory
      pathParts.pop();
      const baseDir = pathParts.join('/') + '/';

      const resolvedUrl = new URL(href, window.location.origin + baseDir);

      // Clean up the path for our routing system
      let target = resolvedUrl.pathname;
      target = target.replace(/\.mdx$/, '').replace(/\/index$/, '');

      navigate(target);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

const mdxComponents = {
  a: MdxLink,
};

const DOC_ITEMS = [
  { title: 'Getting Started', slug: 'getting-started' },
  { title: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts' },
  { title: 'FAQ', slug: 'faq' },
  { title: 'Handling Scenarios', slug: 'scenarios' },
  { title: 'Architecture', slug: 'architecture' },
  { title: 'Changelog', slug: 'changelog' },
];

export default function DocsPage() {
  const params = useParams();
  const slug = params['*'] || '';

  // If no slug, redirect to first doc
  if (!slug) {
    return <Navigate to="/docs/getting-started" replace />;
  }

  const DocComponent = lazyDocs[slug] || lazyDocs[`${slug}/index`] || null;

  return (
    <div className="flex gap-8 items-start">
      {/* Internal Docs Sidebar */}
      <aside className="w-64 sticky top-8 space-y-1 hidden md:block">
        {DOC_ITEMS.map(item => (
          <NavLink
            key={item.slug}
            to={`/docs/${item.slug}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all group',
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-[2px]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {item.title}
          </NavLink>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl min-w-0">
        <div
          className="prose prose-zinc dark:prose-invert max-w-none
          prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-zinc-100
          prose-h1:text-4xl prose-h1:mb-8
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:border-border/50
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:mb-6
          prose-li:text-zinc-400 prose-li:mb-2
          prose-strong:text-zinc-100 prose-strong:font-semibold
          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-pre:p-4
          "
        >
          <Suspense
            fallback={
              <div className="space-y-8 animate-pulse">
                <div className="h-10 w-2/3 bg-zinc-800 rounded" />
                <div className="space-y-3">
                  <div className="h-4 w-full bg-zinc-800/50 rounded" />
                  <div className="h-4 w-full bg-zinc-800/50 rounded" />
                  <div className="h-4 w-3/4 bg-zinc-800/50 rounded" />
                </div>
              </div>
            }
          >
            <MDXProvider components={mdxComponents}>
              {DocComponent ? (
                <DocComponent components={mdxComponents} />
              ) : (
                <div className="text-center py-20">
                  <h1 className="text-2xl font-bold mb-4">Doc not found</h1>
                  <p className="text-muted-foreground">
                    The page you're looking for doesn't exist.
                  </p>
                  <NavLink
                    to="/docs/getting-started"
                    className="text-primary hover:underline mt-4 inline-block"
                  >
                    Go to Getting Started
                  </NavLink>
                </div>
              )}
            </MDXProvider>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
