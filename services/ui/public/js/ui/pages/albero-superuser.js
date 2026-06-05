import { $ } from "/js/utils.js";
import { Tournament } from "/js/domain/Tournament.js";
import { APP_ICONS, roundLabels } from "/js/icons.js";
import { enableFloatingToolbar } from "/js/ui/components/floatingToolbar.js";
import { treeApi } from "/js/api/treeApi.js";
import {
  setup,
  renderTree,
  populateRoundSelects,
  getAlberoMatches,
  setEditable,
  setWinnersEditable,
} from "/js/ui/components/alberoTorneo.js";

function renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds }) {
  const fromRound = Number(fromRoundSelect && fromRoundSelect.value);
  const toRound = Number(toRoundSelect && toRoundSelect.value);
  if (!Number.isFinite(fromRound) || !Number.isFinite(toRound)) return;

  if (toRound > fromRound && toRoundSelect) {
    toRoundSelect.value = String(fromRound);
    renderTree(fromRound, fromRound);
    return;
  }

  renderTree(fromRound, toRound);
}

function renderError(message) {
  const container = $("tree-simple");
  if (!container) return;
  container.innerHTML = `<div style="padding:12px;border:1px solid #f99;background:#fff0f0;color:#900;max-width:720px;margin:12px auto;">${message}</div>`;
}

async function init() {
  const bootstrap = document.getElementById("page-bootstrap");
  const apiUrl = bootstrap?.dataset?.apiUrl || "";
  const tournamentId = bootstrap?.dataset?.tournamentId || "";

  const goSviluppoBtn = document.getElementById("go-sviluppo");
  if (goSviluppoBtn) {
    goSviluppoBtn.innerHTML = (APP_ICONS && APP_ICONS.SVILUPPO) || "";
    goSviluppoBtn.addEventListener("click", () => {
      const id = String(tournamentId || "");
      if (!id) return;
      window.location.href = `/tornei/${encodeURIComponent(id)}/sviluppo`;
    });
  }

  if (document.getElementById("floating-toolbar")) {
    enableFloatingToolbar({
      toolbarId: "floating-toolbar",
      storageKey: `floatingToolbar:albero-superuser:${tournamentId}`,
    });
  }

  const tournament = (await Tournament.fetchTournament(tournamentId, apiUrl)).data[0];
  document.title = `albero superuser ${tournament.name}`;
  const nomeTorneo = $("nome-torneo");
  if (nomeTorneo) nomeTorneo.textContent = `${tournament.name} (risultati ufficiali)`;

  const effectiveRounds = (() => {
    const n = Number(tournament && tournament.roundopen);
    return Number.isFinite(n) && n > 0 ? n : 6;
  })();

  populateRoundSelects(tournament, roundLabels.slice(1));

  const fromRoundSelect = $("fromRound");
  const toRoundSelect = $("toRound");
  if (fromRoundSelect) fromRoundSelect.value = String(effectiveRounds);
  if (toRoundSelect) toRoundSelect.value = "1";

  const onChange = () => renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds });
  if (fromRoundSelect) fromRoundSelect.addEventListener("change", onChange);
  if (toRoundSelect) toRoundSelect.addEventListener("change", onChange);

  setEditable(false);
  setWinnersEditable(false);

  await setup(tournament, { uuid: "superuser" }, apiUrl);

  try {
    const tree = await treeApi.getSuperuserTreeByTournament(tournamentId, apiUrl, true);
    const treeId = tree && (tree.id || tree.uuid);
    if (!treeId) throw new Error("albero superuser non trovato");

    await getAlberoMatches(treeId);
    renderTree(
      Number(fromRoundSelect && fromRoundSelect.value ? fromRoundSelect.value : effectiveRounds),
      Number(toRoundSelect && toRoundSelect.value ? toRoundSelect.value : 1)
    );
  } catch (e) {
    renderError(String(e?.message || e));
  }
}

init();
