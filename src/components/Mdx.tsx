import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import Playground from "@/components/Playground";
import CodeBlock from "@/components/CodeBlock";

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

export default function Mdx({ source }: { source: string }) {
  return (
    <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-pre:bg-transparent prose-pre:p-0 prose-a:text-brand-purple">
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug, rehypeHighlight],
          },
        }}
      />
    </article>
  );
}
