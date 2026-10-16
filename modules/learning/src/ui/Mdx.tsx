import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import Playground from "./Playground";
import CodeBlock from "./CodeBlock";
import { remarkUntrustedMdx } from "@tcf/content/mdx-untrusted";

// Wrap tables so wide ones scroll inside their own box instead of forcing the
// whole page to scroll sideways on mobile (a common cause of broken RTL layouts
// on phones).
function Table(props: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-border">
      <table {...props} className="my-0" />
    </div>
  );
}

const components = { Playground, pre: CodeBlock, table: Table };

// `untrusted` must be set for database-backed (CMS) content: it runs the
// allowlist sanitizer from packages/content/src/mdx-untrusted.ts. Git-reviewed file content
// renders unchanged.
export default function Mdx({
  source,
  untrusted = false,
}: {
  source: string;
  untrusted?: boolean;
}) {
  return (
    <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-pre:bg-transparent prose-pre:p-0 prose-a:text-accent">
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: untrusted ? [remarkGfm, remarkUntrustedMdx] : [remarkGfm],
            rehypePlugins: [rehypeSlug, rehypeHighlight],
          },
        }}
      />
    </article>
  );
}
