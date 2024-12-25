const link = document.createElement("link");
link.href =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
link.rel = "stylesheet";
document.head.appendChild(link);
const style = document.createElement("style");
style.textContent = `
.fa.fa-star.checked {
  color: orange;
}
`;
document.head.appendChild(style);

if (!document.body.dataset.hasCompiledHtml) {
  const checkedStar = `<span class="fa fa-star checked" aria-hidden="true"></span>`;
  const uncheckedStar = `<span class="fa fa-star" aria-hidden="true"></span>`;

  const starsText =
    document.querySelector<HTMLParagraphElement>(".stars")?.textContent;
  const checkedStarCount = (starsText?.match(/★/g) || []).length;
  const uncheckedStarCount = (starsText?.match(/☆/g) || []).length;

  MTBlockEditorSetCompiledHtml(`
<span style="position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; -webkit-clip-path: inset(50%); clip-path: inset(50%); border: 0;">星${checkedStarCount}つ</span>
${
  Array.from({ length: checkedStarCount }, () => checkedStar).join("") +
  Array.from({ length: uncheckedStarCount }, () => uncheckedStar).join("")
}
  `);
}
