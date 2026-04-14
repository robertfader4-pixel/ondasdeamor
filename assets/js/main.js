
(function(){
  const data = window.BOOK_DATA;
  const chapterList = document.getElementById('chapter-list');
  const characterList = document.getElementById('character-list');
  const momentList = document.getElementById('moment-list');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();

  data.chapters.forEach((chapter) => {
    const card = document.createElement('article');
    card.className = 'card chapter-card';
    card.innerHTML = `
      <div class="meta">Глава ${chapter.id}</div>
      <h3>${chapter.title}</h3>
      <p>${chapter.summary}</p>
      <div class="spacer"></div>
      <a class="chapter-link" href="chapter.html?id=${chapter.id}">Открыть главу →</a>
    `;
    chapterList.appendChild(card);
  });

  data.characters.forEach((character) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="meta">${character.role}</div>
      <h3>${character.name}</h3>
      <p>${character.desc}</p>
    `;
    characterList.appendChild(card);
  });

  data.moments.forEach((moment, index) => {
    const item = document.createElement('article');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="meta">Момент ${index + 1}</div>
      <h3>${moment.title}</h3>
      <p>${moment.desc}</p>
    `;
    momentList.appendChild(item);
  });
})();
