"use client";

import md from "@/md_renderer";
import parse from "html-react-parser";
import "@/styles/markdown.css";
import { useEffect, useState } from "react";

type Props = {
  markdown: string;
};

export default function Markdown({ markdown }: Props) {
  const [rendered, setRendered] = useState<string>(md.render(markdown));

  useEffect(() => {
    const html = md.render(markdown);

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    tempDiv.querySelectorAll("*").forEach((element) => {
      element.classList.add("markdown");
    });

    setRendered(tempDiv.innerHTML);
  }, [markdown]);

  return parse(rendered);
}
