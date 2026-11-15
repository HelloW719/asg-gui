export interface SearchForm {
  query: string;
  categories?: string;
  engines?: string;
  language?: string;
  safesearch?: string;
  numResults?: string;
  fanout?: string;
  minScore?: string;
  imagePath?: string;
  timeout?: string;
}

export interface FetchForm {
  url: string;
  render?: "auto" | "always" | "never";
  maxChars?: string;
  timeout?: string;
}

function append(args: string[], flag: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) args.push(flag, normalized);
}

export function buildSearchArgs(form: SearchForm): string[] {
  const args = ["search"];
  if (form.query.trim()) args.push(form.query.trim());
  append(args, "--categories", form.categories);
  append(args, "--engines", form.engines);
  append(args, "--language", form.language);
  append(args, "--safesearch", form.safesearch);
  append(args, "--num-results", form.numResults);
  append(args, "--fanout", form.fanout);
  append(args, "--min-score", form.minScore);
  append(args, "--image-path", form.imagePath);
  append(args, "--timeout", form.timeout);
  return args;
}

export function buildFetchArgs(form: FetchForm): string[] {
  const args = ["fetch", form.url.trim()];
  append(args, "--render", form.render);
  append(args, "--max-chars", form.maxChars);
  append(args, "--timeout", form.timeout);
  return args;
}

