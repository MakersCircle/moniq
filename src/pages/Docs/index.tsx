import { lazy, Suspense, useState } from 'react';
import { useParams, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Book, Code2, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MDXProvider } from '@mdx-js/react';

const docs = import.meta.glob('/src/docs/**/*.mdx');

// Create a map of lazy components once, outside the component to avoid re-creation on render
const lazyDocs = Object.fromEntries(
  Object.entries(docs).map(([path, loader]) => {
    // Transform "/src/docs/api/Types/index.mdx" -> "api/Types/index"
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

const DOC_STRUCTURE = [
  {
    title: 'User Guide',
    icon: Book,
    items: [
      { title: 'Getting Started', slug: 'getting-started', category: 'user' },
      { title: 'Keyboard Shortcuts', slug: 'keyboard-shortcuts', category: 'user' },
      { title: 'FAQ', slug: 'faq', category: 'user' },
      { title: 'Handling Scenarios', slug: 'scenarios', category: 'user' },
    ],
  },
  {
    title: 'Technical Docs',
    icon: Code2,
    items: [{ title: 'Architecture', slug: 'architecture', category: 'tech' }],
  },
  {
    title: 'API Reference',
    icon: Layers,
    items: [
      { title: 'Overview', slug: 'index', category: 'api' },
      { title: 'Core Interfaces', slug: 'Types/index', category: 'api' },
      { title: 'Sync Architecture', slug: 'sync/SyncEngine/index', category: 'api' },
      { title: 'Google Integration', slug: 'lib/google/index', category: 'api' },
    ],
  },
];

export default function DocsPage() {
  const params = useParams();
  const category = params.category || '';
  const slug = params['*'] || '';

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'User Guide': true,
    'Technical Docs': true,
    'API Reference': true,
  });

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // If no category/slug, redirect to first doc
  if (!category || !slug) {
    return <Navigate to="/docs/user/getting-started" replace />;
  }

  // Use the refactored keys for lookup
  const docKey = `${category}/${slug}`;
  const DocComponent = lazyDocs[docKey] || lazyDocs[`${docKey}/index`] || null;

  return (
    <div className="flex gap-8 items-start">
      {/* Internal Docs Sidebar */}
      <aside className="w-64 sticky top-8 space-y-4 hidden md:block">
        {DOC_STRUCTURE.map(section => {
          const isExpanded = expandedSections[section.title];
          return (
            <div key={section.title} className="space-y-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold tracking-tight uppercase text-muted-foreground/70 hover:text-foreground transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-primary" />
                  {section.title}
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {isExpanded && (
                <div className="space-y-1 ml-4 border-l border-border/50">
                  {section.items.map(item => (
                    <NavLink
                      key={item.slug}
                      to={`/docs/${item.category}/${item.slug}`}
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
                </div>
              )}
            </div>
          );
        })}
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
                    to="/docs/user/getting-started"
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
