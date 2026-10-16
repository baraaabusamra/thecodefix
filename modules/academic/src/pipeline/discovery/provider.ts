export interface SearchResult {
  url: string;
  title: string;
  content: string;
  score?: number;
}

export interface SearchOptions {
  limit?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
