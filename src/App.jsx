import { useState, useEffect } from 'react';
import './index.css';

const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R', 'A'];

function App() {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  
  const [deck, setDeck] = useState([]);
  const [currentCards, setCurrentCards] = useState([]);
  const [activeRules, setActiveRules] = useState([]);
  
  const [valetBitch, setValetBitch] = useState(null);
  const [valetMaster, setValetMaster] = useState(null);

  // Pour le suspense au clic
  const [revealedCardIndexes, setRevealedCardIndexes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Plus de useEffect problématique ici !

  const addPlayer = (e) => {
    e.preventDefault();
    if (newPlayerName.trim() && !players.find(p => p.name === newPlayerName.trim())) {
      setPlayers([...players, { name: newPlayerName.trim(), totalSips: 0, turnSips: 0 }]);
      setNewPlayerName('');
    }
  };

  const createDeck = () => {
    const newDeck = [];
    for (let suit of SUITS) {
      for (let i = 0; i < VALUES.length; i++) {
        newDeck.push({ suit, value: VALUES[i], rank: i + 2, isRed: suit === '♥' || suit === '♦' });
      }
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const startGame = () => {
    if (players.length < 2) return alert("Ramène un pote, on boit pas seul !");
    setDeck(createDeck());
    setGameStarted(true);
    setCurrentCards([]);
    setActiveRules([]);
  };

  const adjustSips = (playerName, amount) => {
    setPlayers(players.map(p => 
      p.name === playerName ? { ...p, totalSips: Math.max(0, p.totalSips + amount) } : p
    ));
  };

  const drawTurn = () => {
    if (deck.length < players.length) {
      alert("Y'a plus de cartes ! Ceux qui n'ont pas fini leur verre le finissent cul sec.");
      return;
    }

    setActiveRules([]);
    setRevealedCardIndexes([]);
    setIsDrawing(true);

    const drawnCards = [];
    const tempDeck = [...deck];
    
    for (let i = 0; i < players.length; i++) {
      drawnCards.push({ player: players[i].name, card: tempDeck.pop(), playerIndex: i });
    }
    
    setDeck(tempDeck);
    setCurrentCards(drawnCards);
    setPlayers(players.map(p => ({ ...p, turnSips: 0 })));
  };

  const revealCard = (index) => {
    if (!revealedCardIndexes.includes(index)) {
      const newRevealed = [...revealedCardIndexes, index];
      setRevealedCardIndexes(newRevealed);
      
      // Si on vient de cliquer sur la toute dernière carte
      if (newRevealed.length === currentCards.length) {
        setTimeout(() => {
          // On passe currentPlayersState depuis le hook en utilisant une fonction dans setPlayers si besoin, 
          // mais on va appeler analyzeRules avec les state actuels
          setIsDrawing(false);
          analyzeRules(currentCards, players);
        }, 500);
      }
    }
  };

  const analyzeRules = (drawnCards, currentPlayersState) => {
    const rules = [];
    let sipsToGive = {}; 
    currentPlayersState.forEach(p => sipsToGive[p.name] = 0);
    
    let currentBitch = valetBitch;
    let currentMaster = valetMaster;

    let minRank = 99;
    let minPlayers = [];
    const valuesCount = {};

    drawnCards.forEach(({ player, card }) => {
      if (card.rank < minRank) {
        minRank = card.rank;
        minPlayers = [player];
      } else if (card.rank === minRank) {
        minPlayers.push(player);
      }
      valuesCount[card.value] = (valuesCount[card.value] || 0) + 1;
    });

    minPlayers.forEach(p => sipsToGive[p] += 1);
    rules.push(`👇 Zéro chance pour ${minPlayers.join(', ')} (petite carte). Prends ta gorgée.`);

    Object.entries(valuesCount).forEach(([val, count]) => {
      if (count >= 2) {
        const gorgées = currentPlayersState.length === 2 ? 2 : 1;
        rules.push(`👯 Doublon sur le ${val} ! Ceux qui ne l'ont pas se mangent ${gorgées} gorgée(s).`);
        drawnCards.forEach(({ player, card }) => {
          if (card.value !== val) {
            sipsToGive[player] += gorgées;
          }
        });
      }
    });

    drawnCards.forEach(({ player, card, playerIndex }) => {
      if (card.value === 'V') {
        if (currentBitch) {
          rules.push(`🛑 Fini de souffrir pour ${currentBitch}, tu n'es plus la salope !`);
        }
        currentBitch = player;
        const masterIndex = (playerIndex - 1 + currentPlayersState.length) % currentPlayersState.length;
        currentMaster = currentPlayersState[masterIndex].name;
        rules.push(`🃏 ${player} tire le Valet et devient la salope de ${currentMaster}.`);
      }
      if (card.value === 'R' || card.value === 'D') {
        rules.push(`👑 ${player} a tiré un(e) ${card.value}. Si c'est ton genre : distribue 1 gorgée à tout le monde. Si c'est pas ton genre : tu bois comme un poivrot ! (Bonus humour : si t'es une femme, un vêtement en moins 👗)`);
      }
      if (card.value === 'A') {
        const asSips = currentPlayersState.length;
        rules.push(`🔥 RAGEBAIT ! ${player} prend l'As : ${asSips} gorgées directes !`);
        sipsToGive[player] += asSips;
      }
    });

    if (currentBitch && currentMaster && sipsToGive[currentMaster] > 0) {
      const mirrorSips = sipsToGive[currentMaster];
      sipsToGive[currentBitch] += mirrorSips;
      rules.push(`🔗 Miroir : ${currentMaster} trinque, ${currentBitch} l'accompagne pour ${mirrorSips} gorgée(s).`);
    }

    setValetBitch(currentBitch);
    setValetMaster(currentMaster);
    setActiveRules(rules);

    const updatedPlayers = currentPlayersState.map(p => ({
      ...p,
      turnSips: sipsToGive[p.name] || 0,
      totalSips: p.totalSips + (sipsToGive[p.name] || 0)
    }));
    
    setPlayers(updatedPlayers);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;

  if (!gameStarted) {
    return (
      <div className="app-container">
        <div className="setup-screen">
          <h2>🍺 Jiovanni Game 🍺</h2>
          <form onSubmit={addPlayer}>
            <input 
              type="text" 
              className="input" 
              placeholder="Qui s'assoit ?" 
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
            <button type="submit" className="action-button" style={{ fontSize: '1.2rem', padding: '10px 20px' }}>+</button>
          </form>
          
          <div className="player-tags" style={{ marginTop: '20px' }}>
            {players.map((p, i) => (
              <div key={i} className="player-tag">{p.name}</div>
            ))}
          </div>

          {players.length >= 2 && (
            <button className="action-button" onClick={startGame}>
              S'ASSEOIR
            </button>
          )}
        </div>
      </div>
    );
  }

  const renderPlayers = () => {
    return players.map((p, i) => {
      const posClass = !isMobile ? `player-pos-${i % 6}` : '';
      return (
        <div key={i} className={`player-node ${posClass}`}>
          {valetBitch === p.name && <div className="role-badge">🔗 Salope</div>}
          <div className="player-name">{p.name}</div>
          <div className="player-score">
            🍺 {p.totalSips} {p.turnSips > 0 && <span style={{color: '#ff5252', fontSize: '0.9rem', marginLeft: '5px'}}>+{p.turnSips}</span>}
          </div>
          <div className="player-controls">
            <button className="btn-score" onClick={() => adjustSips(p.name, -1)}>-</button>
            <button className="btn-score" onClick={() => adjustSips(p.name, 1)}>+</button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="app-container">
      {isMobile && (
        <div className="mobile-players-grid">
          {renderPlayers()}
        </div>
      )}

      <div className="poker-table-container">
        <div className="poker-table">
          <h1 className="game-title">Jiovani</h1>
          
          {!isMobile && renderPlayers()}

          <div className="center-stage">
            {currentCards.length > 0 && (
              <div className="cards-display">
                {currentCards.map(({ player, card }, index) => {
                  const isRevealed = revealedCardIndexes.includes(index);

                  return (
                    <div 
                      key={index} 
                      className={`card-container ${isRevealed ? 'revealed' : ''}`}
                      onClick={() => revealCard(index)}
                    >
                      <div className="card-inner">
                        {/* DOS DE LA CARTE */}
                        <div className="card-face card-back"></div>
                        
                        {/* FACE DE LA CARTE */}
                        <div className={`card-face card-front ${card.isRed ? 'red' : 'black'}`}>
                          <div className="player-name-card">{player}</div>
                          <div className="value">{card.value}</div>
                          <div className="suit">{card.suit}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* On cache le bouton Piocher tant qu'on a pas tout révélé pour obliger à finir */}
            {(!isDrawing || currentCards.length === 0) && (
              <button 
                className="action-button" 
                onClick={drawTurn} 
              >
                PIOCHER
              </button>
            )}

            {(!isDrawing || currentCards.length === 0) && (
              <div style={{ color: 'rgba(255,255,255,0.3)', marginTop: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {deck.length} RESTANTES
              </div>
            )}
          </div>

          {/* Résolution du tour affichée sous les cartes, pas en popup */}
          {!isDrawing && activeRules.length > 0 && (
            <div className="resolution-panel">
              <h3>La Douloureuse</h3>
              <ul>
                {activeRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
