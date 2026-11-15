import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
});

const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  token?.attrSet("rel", "noreferrer noopener");
  token?.attrSet("target", "_blank");
  return defaultLinkOpen(tokens, index, options, env, self);
};

export function renderSafeMarkdown(source: string): string {
  return DOMPurify.sanitize(markdown.render(source), {
    USE_PROFILES: { html: true },
  });
}

