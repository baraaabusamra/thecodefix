import { tavily } from "@tavily/core";
import { SearchProvider, SearchOptions, SearchResult } from "./provider";

export class TavilySearchProvider implements SearchProvider {
  private client: ReturnType<typeof tavily>;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.TAVILY_API_KEY;
    if (!key) {
      throw new Error("TAVILY_API_KEY environment variable is missing.");
    }
    this.client = tavily({ apiKey: key });
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      const response = await this.client.search(query, {
        searchDepth: "advanced",
        includeDomains: options?.includeDomains,
        excludeDomains: options?.excludeDomains,
        maxResults: options?.limit ?? 10,
      });

      return response.results.map((r) => ({
        url: r.url,
        title: r.title,
        content: r.content,
        score: r.score,
      }));
    } catch (error) {
      console.error("[TavilySearchProvider] Search failed:", error);
      throw error;
    }
  }
}
