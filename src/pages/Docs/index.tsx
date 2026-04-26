import { lazy, Suspense } from 'react';
import { useParams, Navigate, NavLink } from 'react-router-dom';
import { ChevronRight, Book, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const docs = import.meta.glob('/src/docs/**/*.mdx');

// Create a map of lazy components once, outside the component to avoid re-creation on render
const lazyDocs = Object.fromEntries(
  Object.entries(docs).map(([path, loader]) => [
    path,
    lazy(loader as () => Promise<{ default: React.ComponentType }>),
  ])
);

const DOC_STRUCTURE = [
  {
    title: 'User Guide',
    icon: Book,
    items: [
      { title: 'Getting Started', slug: 'getting-started', category: 'user' },
      { title: 'FAQ', slug: 'faq', category: 'user' },
      { title: 'Handling Scenarios', slug: 'scenarios', category: 'user' },
    ],
  },
  {
    title: 'Technical Docs',
    icon: Code2,
    items: [{ title: 'Architecture', slug: 'architecture', category: 'tech' }],
  },
];

export default function DocsPage() {
  const { category, slug } = useParams();

  // If no category/slug, redirect to first doc
  if (!category || !slug) {
    return <Navigate to="/docs/user/getting-started" replace />;
  }

  const path = `/src/docs/${category}/${slug}.mdx`;
  const DocComponent = lazyDocs[path] || null;

  return (
    <div className="flex gap-8 items-start">
      {/* Internal Docs Sidebar */}
      <aside className="w-64 sticky top-8 space-y-8 hidden md:block">
        {DOC_STRUCTURE.map(section => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1">
              <section.icon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground/70">
                {section.title}
              </h3>
            </div>
            <div className="space-y-1">
              {section.items.map(item => (
                <NavLink
                  key={item.slug}
                  to={`/docs/${item.category}/${item.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform',
                      category === item.category && slug === item.slug
                        ? 'rotate-90'
                        : 'group-hover:translate-x-1'
                    )}
                  />
                  {item.title}
                </NavLink>
              ))}
            </div>
          </div>
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
            {DocComponent ? (
              <DocComponent />
            ) : (
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold mb-4">Doc not found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
                <NavLink
                  to="/docs/user/getting-started"
                  className="text-primary hover:underline mt-4 inline-block"
                >
                  Go to Getting Started
                </NavLink>
              </div>
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
