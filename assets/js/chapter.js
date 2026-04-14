
(function(){
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id')) || 1;
  const data = window.BOOK_DATA;
  const chapter = data.chapters.find((item) => item.id === id) || data.chapters[0];

  document.title = `${chapter.title} — Северная любовь`;
  document.getElementById('chapter-title').textContent = chapter.title;
  document.getElementById('chapter-summary').textContent = chapter.summary;

  const content = document.getElementById('chapter-content');
  chapter.paras.forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    content.appendChild(p);
  });

  const nav = document.getElementById('chapter-nav');
  data.chapters.forEach((item) => {
    const link = document.createElement('a');
    link.href = `chapter.html?id=${item.id}`;
    link.textContent = item.title;
    if (item.id === chapter.id) link.classList.add('active');
    nav.appendChild(link);
  });
})();
