






albergo.abita = (piano) => {
    const stanze = document.getElementsByClassName(`treant-node round-${piano}`);
    
    const setupPlayerElement = (player, isWinner = false) => {
        const element = player.createInfoElement();
        element.classList.add('player-card');
        if(isWinner) element.classList.add('winner');
        return element;
    };

    const createWinnerButton = (player1, player2, container) => {
        const button = document.createElement('button');
        button.className = 'winner-selector';
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            container.querySelectorAll('.player-card').forEach(card => card.classList.remove('winner'));
            
            // Alterna tra i due giocatori
            const currentWinner = container.querySelector('.winner');
            if(!currentWinner || currentWinner === player2.element) {
                player1.element.classList.add('winner');
            } else {
                player2.element.classList.add('winner');
            }
        });
        
        return button;
    };

    const handlePlayerClick = (event) => {
        event.stopPropagation();
        dialog.open({
            operazione: ((clickedElement) => {
                return function(selectedPlayer) {
                    const container = clickedElement.parentElement;
                    const newElement = setupPlayerElement(selectedPlayer);
                    container.replaceChild(newElement, clickedElement);
                    // Riattacca l'event listener
                    newElement.addEventListener('click', handlePlayerClick);
                };
            })(event.currentTarget)
        });
    };

    let i = 0;
    while (stanze[i]) {
        stanze[i].replaceChildren();
        const letto = document.createElement("div");
        letto.className = "match-container";
        
        const giocatore1 = players.find(pl => pl.id === 10);
        const giocatore2 = players.find(pl => pl.id === 20);
        
        const player1 = {
            data: giocatore1,
            element: setupPlayerElement(giocatore1)
        };
        
        const player2 = {
            data: giocatore2,
            element: setupPlayerElement(giocatore2)
        };
        
        const winnerButton = createWinnerButton(player1, player2, letto);
        
        // Aggiungi gli event listener ai player
        player1.element.addEventListener('click', handlePlayerClick);
        player2.element.addEventListener('click', handlePlayerClick);
        
        letto.append(player1.element, player2.element, winnerButton);
        stanze[i].appendChild(letto);
        i++;
    }
};