const els = {
  species: document.getElementById("species"),
  symbol: document.getElementById("symbol"),
  searchBtn: document.getElementById("searchBtn"),
  clearBtn: document.getElementById("clearBtn"),
  status: document.getElementById("status"),
  card: document.getElementById("card"),

  geneName: document.getElementById("geneName"),
  ensemblLink: document.getElementById("ensemblLink"),
  geneDesc: document.getElementById("geneDesc"),

  ensemblId: document.getElementById("ensemblId"),
  chrom: document.getElementById("chrom"),
  coords: document.getElementById("coords"),
  strand: document.getElementById("strand"),

  biotypeChip: document.getElementById("biotypeChip"),
  speciesChip: document.getElementById("speciesChip"),
};

let currentAbort = null;

function setStatus(message, type = "info") {
  els.status.textContent = message || "";
  els.status.style.color = type === "error" ? "var(--danger)" : "";
}

function showCard(show) {
  els.card.classList.toggle("hidden", !show);
}

function setLoading(isLoading) {
  els.searchBtn.disabled = isLoading;
  els.clearBtn.disabled = isLoading;
  els.species.disabled = isLoading;
  els.symbol.disabled = isLoading;
}

function normalizeSymbol(s) {
  return (s || "").trim();
}

async function fetchGene(species, symbol) {
  if (currentAbort) currentAbort.abort();
  currentAbort = new AbortController();

  const base = "https://rest.ensembl.org";
  const url = `${base}/lookup/symbol/${encodeURIComponent(species)}/${encodeURIComponent(symbol)}?expand=0`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: currentAbort.signal,
  });

  if (!res.ok) {
    // 404 usually means gene symbol not found for that species
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return await res.json();
}

function renderGene(gene, species) {
  const display = gene.display_name || "(no display name)";
  els.geneName.textContent = display;

  // Link to Ensembl site using stable ID
  const id = gene.id || "";
  els.ensemblLink.href = id ? `https://www.ensembl.org/id/${encodeURIComponent(id)}` : "#";

  els.geneDesc.textContent = gene.description || "No description available.";

  els.ensemblId.textContent = id || "(unknown)";
  els.chrom.textContent = gene.seq_region_name ?? "(unknown)";
  els.coords.textContent = `${gene.start ?? "?"} – ${gene.end ?? "?"}`;
  els.strand.textContent = gene.strand === 1 ? "+" : (gene.strand === -1 ? "-" : "(unknown)");

  els.biotypeChip.textContent = gene.biotype ? `Biotype: ${gene.biotype}` : "Biotype: (unknown)";
  els.speciesChip.textContent = `Species: ${species}`;
}

async function runSearch() {
  const species = els.species.value;
  const symbol = normalizeSymbol(els.symbol.value);

  showCard(false);

  if (!symbol) {
    setStatus("Type a gene symbol (example: TP53).");
    return;
  }

  setLoading(true);
  setStatus("Loading…");

  try {
    const gene = await fetchGene(species, symbol);

    renderGene(gene, species);
    setStatus("");
    showCard(true);
  } catch (err) {
    if (err.name === "AbortError") return;

    // helpful error message for not-found
    if (err.status === 404) {
      setStatus(`No gene found for "${symbol}" in ${species}. Try another symbol/species.`, "error");
    } else {
      setStatus(`Error: ${err.message}`, "error");
    }
    showCard(false);
  } finally {
    setLoading(false);
  }
}

function clearUI() {
  els.symbol.value = "";
  setStatus("");
  showCard(false);
  els.symbol.focus();
}

function init() {
  els.searchBtn.addEventListener("click", runSearch);
  els.clearBtn.addEventListener("click", clearUI);

  // Enter key triggers search
  els.symbol.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  // small default
  els.symbol.value = "TP53";
}

init();
