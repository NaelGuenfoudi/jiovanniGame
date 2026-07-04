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

  const [revealedCardIndexes, setRevealedCardIndexes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDouloureuseExpanded, setIsDouloureuseExpanded] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

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
    setIsDouloureuseExpanded(false);

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
      
      if (newRevealed.length === currentCards.length) {
        setTimeout(() => {
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
    rules.push(`👇 ${minPlayers.join(', ')} : +1 🍺 (Plus petite carte)`);

    Object.entries(valuesCount).forEach(([val, count]) => {
      if (count >= 2) {
        const gorgées = currentPlayersState.length === 2 ? 2 : 1;
        rules.push(`👯 Doublon ${val} ! Les autres : +${gorgées} 🍺`);
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
          rules.push(`🛑 ${currentBitch} est libéré(e) !`);
        }
        currentBitch = player;
        const masterIndex = (playerIndex - 1 + currentPlayersState.length) % currentPlayersState.length;
        currentMaster = currentPlayersState[masterIndex].name;
        rules.push(`🃏 ${player} devient la salope de ${currentMaster}`);
      }
      if (card.value === 'R' || card.value === 'D') {
        rules.push(`👑 ${player} (${card.value}) : Ton genre = Distribue 1 🍺/pers. Pas ton genre = Bois sec ! 👗(Femme = 1 vêtement)`);
      }
      if (card.value === 'A') {
        const asSips = currentPlayersState.length;
        rules.push(`🔥 AS RAGEBAIT ! ${player} prend +${asSips} 🍺 direct`);
        sipsToGive[player] += asSips;
      }
    });

    if (currentBitch && currentMaster && sipsToGive[currentMaster] > 0) {
      const mirrorSips = sipsToGive[currentMaster];
      sipsToGive[currentBitch] += mirrorSips;
      rules.push(`🔗 Miroir : ${currentBitch} boit +${mirrorSips} 🍺 avec son maître`);
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

  return (
    <div className="app-container">
      <button className="btn-rules-trigger" onClick={() => setShowRulesModal(true)}>📖</button>

      {showRulesModal && (
        <div className="rules-modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="rules-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowRulesModal(false)}>X</button>
            <h2>📖 Règles du Jiovani Game</h2>
            <ul>
              <li><strong>Plus petite carte :</strong> 1 gorgée pour le ou les perdants.</li>
              <li><strong>Doublon :</strong> Ceux qui n'ont PAS le doublon prennent 1 gorgée (ou 2 s'il n'y a que 2 joueurs).</li>
              <li><strong>Valet :</strong> Le joueur devient la "salope" du joueur à sa gauche. Il boit chaque fois que son maître boit, jusqu'au prochain Valet.</li>
              <li><strong>Roi / Dame :</strong> 
                <br/>- <em>Si c'est ton genre :</em> Distribue 1 gorgée à chaque joueur.
                <br/>- <em>Si ce n'est pas ton genre :</em> Tu bois sec ! (Bonus : si tu es une femme, tu enlèves un vêtement).
              </li>
              <li><strong>As (Ragebait) :</strong> Le joueur prend instantanément autant de gorgées qu'il y a de joueurs à la table !</li>
              <li><strong>Fin du deck :</strong> Ceux qui n'ont pas fini leur verre le finissent cul sec.</li>
            </ul>
          </div>
        </div>
      )}

      {!gameStarted ? (
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
      ) : (
        <>
          {isMobile && (
            <div className="mobile-players-grid">
              {players.map((p, i) => (
                <div key={i} className="player-node">
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
              ))}
            </div>
          )}

          <div className="poker-table-container">
            <div className="poker-table">
              <h1 className="game-title">Jiovani</h1>
              
              {!isMobile && players.map((p, i) => {
                const posClass = `player-pos-${i % 6}`;
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
              })}

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
                            <div className="card-face card-back"></div>
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

                {/* Résolution du tour affichée sous les cartes, rétractable */}
                {!isDrawing && activeRules.length > 0 && (
                  <div className="resolution-panel">
                    <h3 onClick={() => setIsDouloureuseExpanded(!isDouloureuseExpanded)} className="douloureuse-header">
                      <span>La Douloureuse</span>
                      <span className="toggle-icon">{isDouloureuseExpanded ? '▲' : '▼'}</span>
                    </h3>
                    {isDouloureuseExpanded && (
                      <ul>
                        {activeRules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Bouton d'action et compteur */}
                {(!isDrawing || currentCards.length === 0) && (
                  <div className="action-bar">
                    <button className="action-button" onClick={drawTurn}>
                      PIOCHER
                    </button>
                    <div className="cards-remaining">
                      {deck.length} CARTES RESTANTES
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default App;
