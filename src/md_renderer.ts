import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: true,
  typographer: true,
  breaks: true,

  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (e) {
        console.error(e);
      }
    }

    return "";
  },
});

// Open links in new tab
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const aIndex = tokens[idx].attrIndex("target");

  if (aIndex < 0) {
    const attrs = tokens[idx].attrs;
    const href = attrs?.find(([name]) => name === "href");

    if (href && !href[1].startsWith("#")) {
      tokens[idx].attrPush(["target", "_blank"]);
    }
  } else {
    const attrs = tokens[idx].attrs;

    if (attrs) {
      // Check if the link points to an id
      const href = attrs.find(([name]) => name === "href");

      if (href && !href[1].startsWith("#")) {
        attrs[aIndex][1] = "_blank";
      }
    }
  }

  return self.renderToken(tokens, idx, options);
};

export default md;
