const style = document.createElement("style");
style.textContent = `
blockquote a {
  display: block;
  text-align: right;
}
`;
document.head.appendChild(style);

if (!document.body.dataset.hasCompiledHtml) {
  const name =
    document.querySelector<HTMLParagraphElement>(".name")?.textContent;
  const res = await fetch(
    `https://ja.wikipedia.org/w/api.php?format=json&action=query&origin=*&list=search&srlimit=1&srsearch=${name}`
  );
  const data = await res.json();
  const entry = data.query.search[0];

  MTBlockEditorSetCompiledHtml(`<blockquote>
${entry.snippet}
<a href="https://ja.wikipedia.org/${entry.title}">${entry.title}</a>
</blockquote>`);
}

export {};
