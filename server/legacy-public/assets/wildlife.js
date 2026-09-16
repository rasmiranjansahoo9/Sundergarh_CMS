document.addEventListener("DOMContentLoaded", function () {
  const tabs = Array.from(document.querySelectorAll(".filter-tab"));
  const sections = Array.from(document.querySelectorAll(".species-section"));
  const cards = Array.from(document.querySelectorAll(".species-card"));
  const search = document.getElementById("speciesSearch");
  const noResults = document.getElementById("noSpecies");
  const clearBtn = document.getElementById("clearSpeciesSearch");

  let activeFilter = "all";

  function applyFilters() {
    const query = (search ? search.value : "").trim().toLowerCase();
    let visible = 0;

    cards.forEach(function(card) {
      const type = (card.dataset.type || "").toLowerCase();
      const haystack = ((card.dataset.search || "") + " " + card.textContent).toLowerCase();

      const typeMatch = activeFilter === "all" || type === activeFilter;
      const textMatch = !query || haystack.includes(query);
      const show = typeMatch && textMatch;

      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });

    sections.forEach(function(section) {
      const hasVisibleCard = section.querySelector(".species-card:not(.hidden)");
      section.classList.toggle("hidden", !hasVisibleCard);
    });

    if (noResults) noResults.classList.toggle("show", visible === 0);
  }

  tabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      activeFilter = tab.dataset.filter || "all";
      tabs.forEach(function(item) {
        item.classList.toggle("active", item === tab);
      });
      applyFilters();
    });
  });

  if (search) {
    search.addEventListener("input", applyFilters);
    search.addEventListener("search", applyFilters);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      if (search) {
        search.value = "";
        search.focus();
      }
      activeFilter = "all";
      tabs.forEach(function(item) {
        item.classList.toggle("active", item.dataset.filter === "all");
      });
      applyFilters();
    });
  }

  applyFilters();
});
