document.addEventListener("DOMContentLoaded", function () {
  const filters = [...document.querySelectorAll(".gallery-filter .filter")];
  const cards = [...document.querySelectorAll(".photo-card")];

  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter || "all";
      filters.forEach(b => b.classList.toggle("active", b === btn));
      cards.forEach(card => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  const box = document.getElementById("mediaLightbox");
  const content = document.getElementById("lightboxContent");
  const close = document.getElementById("lightboxClose");
  const prev = document.getElementById("lightboxPrev");
  const next = document.getElementById("lightboxNext");
  let current = -1;

  function openPhoto(index) {
    current = index;
    const card = cards[index];
    if (!card) return;
    content.innerHTML = '<img src="' + card.dataset.image + '" alt=""><div class="lightbox-caption">' + (card.dataset.title || "") + '</div>';
    box.classList.add("open");
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeBox() {
    box.classList.remove("open");
    box.setAttribute("aria-hidden", "true");
    content.innerHTML = "";
    document.body.style.overflow = "";
  }

  cards.forEach((card, index) => {
    card.addEventListener("click", () => openPhoto(index));
  });

  prev.addEventListener("click", () => openPhoto((current - 1 + cards.length) % cards.length));
  next.addEventListener("click", () => openPhoto((current + 1) % cards.length));
  close.addEventListener("click", closeBox);

  box.addEventListener("click", e => {
    if (e.target === box) closeBox();
  });

  document.addEventListener("keydown", e => {
    if (!box.classList.contains("open")) return;
    if (e.key === "Escape") closeBox();
    if (e.key === "ArrowLeft") prev.click();
    if (e.key === "ArrowRight") next.click();
  });

  document.querySelectorAll(".play-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.video;
      content.innerHTML = '<iframe class="lightbox-video" src="https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      box.classList.add("open");
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });


  const pubSearch = document.getElementById("publicationSearch");
  const pubFilters = [...document.querySelectorAll(".pub-filter")];
  const pubCards = [...document.querySelectorAll(".publication-card")];
  const pubEmpty = document.getElementById("publicationEmpty");
  let activePubFilter = "all";
  function applyPublicationFilters(){
    const q = (pubSearch?.value || "").trim().toLowerCase();
    let visible = 0;
    pubCards.forEach(card=>{
      const category=card.dataset.pubCategory||"";
      const hay=((card.dataset.pubSearch||"")+" "+card.textContent).toLowerCase();
      const show=(activePubFilter==="all"||category===activePubFilter)&&(!q||hay.includes(q));
      card.classList.toggle("pub-hidden",!show); if(show) visible++;
    });
    pubEmpty?.classList.toggle("show",visible===0);
  }
  pubFilters.forEach(btn=>btn.addEventListener("click",()=>{
    activePubFilter=btn.dataset.pubFilter||"all";
    pubFilters.forEach(b=>b.classList.toggle("active",b===btn)); applyPublicationFilters();
  }));
  pubSearch?.addEventListener("input",applyPublicationFilters); applyPublicationFilters();

});