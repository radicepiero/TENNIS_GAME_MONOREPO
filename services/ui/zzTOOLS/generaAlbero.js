import { Tree } from "/js/Tree.js";
import Player from "/js/Player.js";
import { Tournament } from "/js/Tournament.js";
import { PennaDialogo } from "/js/pennaDialogo.js";
// Inizializza la finestra di dialogo
const apiUrl = "<%= apiUrl %>";
const user = "<%- JSON.stringify(user) %>";
const tournamentId = "<%= tournamentId %>";
const tournament = (await Tournament.fetchTournament(tournamentId, apiUrl))
  .data[0];
const players = await Player.fetchByTournament(tournament, apiUrl);
//console.log("players",players)
document.getElementsByTagName(
  "title"
)[0].innerText = `programma ${tournament.name}`;

const albero = Tree.generate({
  name: `${new Date()} ${user.soprannome || user.email}`,
  tournament: tournament,
  ownerId: user.uuid,
  numPlayers: 2 ** tournament.rounds,
});

const giocatoreNull = new Player({ id: 0 });
players.push(giocatoreNull);
const giocatoreBye = new Player({ id: 0, name: "BYE" });
players.push(giocatoreBye);

const dialog = new PennaDialogo("#dialogContainer", {
  options: players,
});

const chart_config = {
  chart: {
    container: "#tree-simple",
    rootOrientation: "EAST",
    nodeAlign: "BOTTOM",
    connectors: { type: "step" },
    node: { HTMLclass: "node" },
  },
  nodeStructure: albero.toTreantNodeStructure(),
};

const albergo = new Treant(chart_config); // Ricrea il grafico

//costruisco l'elemento tennista con il suo bottone per chiamare la finestra di dialogo
const setupPlayerElement = (player) => {
  const newElement = player.createInfoElement();
  newElement.addEventListener("click", handlePlayerClick);
  return newElement;
};

const handlePlayerClick = (event) => {
  event.stopPropagation();
  //opzione con binding: si creaa una funzione alla quale si collegano nel suo  contesto le variabili chiamante e destinatatio: this è il contesto della funzione
  /*dialog.open({
              operazione : function() {console.log(this.chiamante,this.destinatario)}.bind({chiamante: stanzaCorrente, destinatario: stanzaCorrente}) // ✅ Funziona!
            });*/

  //qui si utilizza una closure: si noti che le arrow functions non hanno un loro contesto
  // ma lo ereditano oppure è nullo: this non esiste
  //le closures sono closure per una proprietà di js basta che sia una funzione restituita  da un'altra
  // La restituità avrà accesso alle variabili della esterna anche se questa è terminata
  // si noti che la funzione restituita potrebbe essere scritta nella forma function()={}

  //in questa closure vado ad aprire la finestra di dialogo e le passo la funzione che deve essere eseguita quando si clicca conferma
  dialog.open({
    operazione: ((clickedElement) => {
      return function (selectedPlayer) {
        const container = clickedElement.parentElement;
        const newElement = setupPlayerElement(selectedPlayer);
        container.replaceChild(newElement, clickedElement);
      };
    })(event.currentTarget),
  });
};

function creaComodino(emoji) {
  const comodino = document.createElement("span");
  comodino.className = "toggle-winner";
  comodino.textContent = emoji;
  return comodino;
}

function aggiornaVincitore(comodino1, comodino2) {
  return () => {
    const container1 = comodino1.parentElement;
    const container2 = comodino2.parentElement;

    const match = container1.parentElement.parentElement;
    const matchId = match.id;
    const fatherMatch = albero.matches.find((el) => el.uuid === matchId);
    const fatherId = fatherMatch?.fatherId;

    if (comodino1.textContent === "👎") {
      comodino1.textContent = "👍";
      comodino2.textContent = "👎";

      container1.classList.remove("looser");
      container1.classList.add("winner");
      container2.classList.remove("winner");
      container2.classList.add("looser");

      if (fatherId) {
        const newPlayers = match.cloneNode(true);
        document.getElementById(fatherId)?.appendChild(newPlayers);
      }
    } else {
      comodino1.textContent = "👎";
      comodino2.textContent = "👍";

      container2.classList.remove("looser");
      container2.classList.add("winner");
      container1.classList.remove("winner");
      container1.classList.add("looser");
    }
  };
}

function creaPostoLetto(giocatore, comodino) {
  const divGiocatore = setupPlayerElement(giocatore);
  const postoLetto = document.createElement("div");
  postoLetto.className = "posto-letto";
  postoLetto.append(divGiocatore, comodino);
  return postoLetto;
}

function costruisciLetto(giocatore1, giocatore2) {
  const letto = document.createElement("div");
  letto.className = "players";

  const comodino1 = creaComodino("👎");
  const comodino2 = creaComodino("👍");

  const handler = aggiornaVincitore(comodino1, comodino2);
  comodino1.addEventListener("click", handler);
  comodino2.addEventListener("click", handler);

  const postoLetto1 = creaPostoLetto(giocatore1, comodino1);
  const postoLetto2 = creaPostoLetto(giocatore2, comodino2);

  letto.append(postoLetto1, postoLetto2);
  return letto;
}

albergo.abita = (piano) => {
  const stanze = document.getElementsByClassName(`treant-node round-${piano}`);

  let i = 0;
  while (stanze[i]) {
    stanze[i].replaceChildren();

    const giocatore1 = players.find((pl) => pl.id === 0);
    const giocatore2 = players.find((pl) => pl.id === 0);

    const letto = costruisciLetto(giocatore1, giocatore2);
    stanze[i].appendChild(letto);

    i++;
  }
};
albergo.abita(tournament.rounds);
