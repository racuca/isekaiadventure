import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Player, Enemy, LogEntry, TileType, Position, MapEntity } from './types';
import { generateStoryIntro, generateMonster, generateEndingStory, getMonsterEmoji } from './services/geminiService';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';

// --- Map Configuration ---
const MAP_WIDTH = 60;
const MAP_HEIGHT = 40;
const VIEWPORT_WIDTH = 13;
const VIEWPORT_HEIGHT = 9;

// Helper to create a larger, zoned map
const generateMap = (): TileType[][] => {
  const map: TileType[][] = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TileType.GRASS));

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Borders
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        map[y][x] = TileType.WATER;
        continue;
      }

      // Zone 1: Grasslands (Top Left) - Default

      // Zone 2: Forest (Top Right)
      if (x > 25 && y < 20) {
        map[y][x] = TileType.FOREST;
        if (Math.random() < 0.15) map[y][x] = TileType.TREE;
      }

      // Zone 3: Sand/Wasteland (Bottom Left)
      if (x < 30 && y >= 20) {
        map[y][x] = TileType.SAND;
        if (Math.random() < 0.05) map[y][x] = TileType.MOUNTAIN;
      }

      // Zone 4: Dungeon Area (Bottom Right)
      if (x >= 30 && y >= 20) {
        map[y][x] = TileType.DUNGEON_FLOOR;
        if (Math.random() < 0.1) map[y][x] = TileType.MOUNTAIN; // Walls inside dungeon
      }

      // Random obstacles in Grass
      if (x <= 25 && y < 20) {
         if (Math.random() < 0.05) map[y][x] = TileType.TREE;
         if (Math.random() < 0.02) map[y][x] = TileType.WATER; // Ponds
      }
    }
  }

  // River dividing Left and Right
  for(let y=0; y<MAP_HEIGHT; y++) {
     map[y][25] = TileType.WATER;
     map[y][26] = TileType.WATER;
  }
  // Bridges
  map[10][25] = TileType.GRASS; map[10][26] = TileType.GRASS;
  map[30][25] = TileType.SAND; map[30][26] = TileType.DUNGEON_FLOOR;

  // Place Town (Top Left area)
  for(let y=2; y<=4; y++) {
      for(let x=2; x<=4; x++) {
          map[y][x] = TileType.TOWN;
      }
  }

  // Boss Floor Decoration
  map[MAP_HEIGHT-3][MAP_WIDTH-3] = TileType.BOSS_FLOOR;

  return map;
};

// Generate initial visible enemies on the map
const spawnEnemies = (map: TileType[][]): MapEntity[] => {
    const entities: MapEntity[] = [];
    let idCounter = 0;

    const addEntity = (x: number, y: number, type: MapEntity['type'], name: string, zone: string, isBoss: boolean = false) => {
        entities.push({
            id: `enemy-${idCounter++}`,
            position: { x, y },
            type,
            name,
            emoji: getMonsterEmoji(name, isBoss),
            zone,
            isBoss
        });
    };

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            
            // Skip safe zones and walls
            if (tile === TileType.TOWN || tile === TileType.WATER || tile === TileType.TREE || tile === TileType.MOUNTAIN) continue;
            // Skip start area
            if (x < 8 && y < 8) continue;

            // Boss
            if (tile === TileType.BOSS_FLOOR) {
                addEntity(x, y, 'BOSS', 'Demon King', 'DUNGEON', true);
                continue;
            }

            // Random Spawns
            const rand = Math.random();
            if (tile === TileType.GRASS && rand < 0.02) {
                addEntity(x, y, 'SLIME', 'Slime', 'GRASS');
            } else if (tile === TileType.FOREST && rand < 0.04) {
                addEntity(x, y, rand < 0.5 ? 'WOLF' : 'GOBLIN', rand < 0.5 ? 'Dire Wolf' : 'Goblin Scout', 'FOREST');
            } else if (tile === TileType.SAND && rand < 0.03) {
                 addEntity(x, y, 'UNKNOWN', 'Sand Worm', 'SAND');
            } else if (tile === TileType.DUNGEON_FLOOR && rand < 0.05) {
                 addEntity(x, y, 'SKELETON', 'Skeleton Warrior', 'DUNGEON');
            }
        }
    }
    return entities;
};

const INITIAL_PLAYER: Player = {
  name: '',
  level: 1,
  hp: 100,
  maxHp: 100,
  atk: 10,
  exp: 0,
  maxExp: 100,
  gold: 0,
  potions: 3,
  position: { x: 3, y: 3 } // Start at Town center
};

const App: React.FC = () => {
  // State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOGIN);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [townMessage, setTownMessage] = useState('');
  
  // Map State
  const mapRef = useRef<TileType[][]>(generateMap());
  const [mapEntities, setMapEntities] = useState<MapEntity[]>([]);
  const lastProcessedPos = useRef<Position>(INITIAL_PLAYER.position);

  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const combatLogRef = useRef<HTMLDivElement>(null);

  // Initialize Map Entities once
  useEffect(() => {
     setMapEntities(spawnEnemies(mapRef.current));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    combatLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, phase]);

  // Helper: Add Log
  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setLogs(prev => [...prev.slice(-19), { id, text, type }]);
  };

  // --- Movement & Input Logic ---

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (phase !== GamePhase.MAP) return;

    setPlayer(prev => {
      const newX = prev.position.x + dx;
      const newY = prev.position.y + dy;

      // Check bounds
      if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return prev;

      // Check Collision
      const tile = mapRef.current[newY][newX];
      if (tile === TileType.TREE || tile === TileType.MOUNTAIN || tile === TileType.WATER) {
        return prev; // Blocked
      }

      return { ...prev, position: { x: newX, y: newY } };
    });
  }, [phase]);

  // Handle tile events & Entity Collision
  useEffect(() => {
    if (phase !== GamePhase.MAP) return;

    const { x, y } = player.position;
    
    // Prevent re-triggering event on the same tile instantly (though for adjacency combat we scan every move)
    // Actually, for adjacency, we need to scan even if we moved.
    // However, for Town entry, we should debounce.
    const isNewTile = x !== lastProcessedPos.current.x || y !== lastProcessedPos.current.y;
    lastProcessedPos.current = { x, y };

    const tile = mapRef.current[y][x];

    // 1. Check Town Entry
    if (isNewTile && tile === TileType.TOWN) {
      setPhase(GamePhase.TOWN);
      setTownMessage("Welcome back to town!");
      addLog("You entered the Town.", 'info');
      return;
    }

    // 2. Check for Neighboring Enemies (Adjacency Trigger)
    // We check Up, Down, Left, Right for any entity
    const neighbors = [
        { x: x, y: y - 1 },
        { x: x, y: y + 1 },
        { x: x - 1, y: y },
        { x: x + 1, y: y },
    ];

    // Find if any neighbor has an entity
    const adjacentEntity = mapEntities.find(e => 
        neighbors.some(n => n.x === e.position.x && n.y === e.position.y)
    );

    if (adjacentEntity) {
        // Combat Trigger!
        // We only trigger if we are not already fighting (handled by phase check)
        // AND we should probably ensure we didn't JUST run away from it? (Ignored for simplicity now)
        startCombat(adjacentEntity);
    }

  }, [player.position, phase, mapEntities]);

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (phase === GamePhase.MAP) {
            switch (e.key) {
                case 'ArrowUp': case 'w': movePlayer(0, -1); break;
                case 'ArrowDown': case 's': movePlayer(0, 1); break;
                case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
                case 'ArrowRight': case 'd': movePlayer(1, 0); break;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, phase]);


  // --- Game Actions ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPw) return;

    setLoading(true);
    setPlayer(prev => ({ ...prev, name: loginId }));
    
    // Generate Intro
    try {
      const intro = await generateStoryIntro(loginId);
      setStoryText(intro);
      setPhase(GamePhase.INTRO);
    } catch (err) {
      addLog("Failed to load story.", 'danger');
      setPhase(GamePhase.INTRO);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    setPhase(GamePhase.TOWN);
    setTownMessage("Welcome to the safe zone.");
    addLog(`Welcome to the world, ${player.name}. Use arrow keys to move.`, 'info');
  };

  const leaveTown = () => {
    setPhase(GamePhase.MAP);
    setTownMessage("");
    addLog("You left the town.", 'info');
  };

  const startCombat = async (mapEntity: MapEntity) => {
    setLoading(true);
    setPhase(GamePhase.COMBAT);

    try {
      let level = player.level;
      if (mapEntity.isBoss) level = 50; 
      else if (mapEntity.zone === 'DUNGEON') level += 3;
      else if (mapEntity.zone === 'FOREST') level += 1;

      // Use the map entity's name as a base for generation
      const newEnemy = await generateMonster(level, mapEntity.zone, mapEntity.isBoss, mapEntity.name);
      
      // Link the generated enemy stats to the map entity ID so we can remove it on win
      setEnemy({ ...newEnemy, id: mapEntity.id });
      
      if (mapEntity.isBoss) addLog("You face the Demon King!", 'danger');
      else addLog(`You encountered a ${newEnemy.name}!`, 'combat');

    } catch (error) {
      console.error(error);
      addLog("The monster vanished.", 'info');
      setPhase(GamePhase.MAP);
    } finally {
      setLoading(false);
    }
  };

  const handleAttack = () => {
    if (!enemy) return;

    const damage = Math.floor(player.atk * (0.8 + Math.random() * 0.4));
    const newEnemyHp = Math.max(0, enemy.hp - damage);
    
    addLog(`You hit ${enemy.name} for ${damage} dmg!`, 'combat');
    setEnemy(prev => prev ? ({ ...prev, hp: newEnemyHp }) : null);

    if (newEnemyHp <= 0) {
      handleVictory(enemy);
    } else {
      setTimeout(() => enemyTurn(newEnemyHp), 600);
    }
  };

  const enemyTurn = (currentEnemyHp: number) => {
    if (!enemy || currentEnemyHp <= 0) return;

    const damage = Math.max(1, Math.floor(enemy.atk * (0.8 + Math.random() * 0.4)));
    const newPlayerHp = Math.max(0, player.hp - damage);

    setPlayer(prev => ({ ...prev, hp: newPlayerHp }));
    addLog(`${enemy.name} hits you for ${damage} dmg!`, 'danger');

    if (newPlayerHp <= 0) {
      handleDefeat();
    }
  };

  const handleVictory = (defeatedEnemy: Enemy) => {
    addLog(`Victory! Gained ${defeatedEnemy.expReward} EXP, ${defeatedEnemy.goldReward} Gold.`, 'success');
    
    // Remove entity from map if it has an ID
    if (defeatedEnemy.id) {
        setMapEntities(prev => prev.filter(e => e.id !== defeatedEnemy.id));
    }

    let newExp = player.exp + defeatedEnemy.expReward;
    let newGold = player.gold + defeatedEnemy.goldReward;
    let newLevel = player.level;
    let newMaxExp = player.maxExp;
    let newMaxHp = player.maxHp;
    let newAtk = player.atk;
    let hp = player.hp;

    if (newExp >= player.maxExp) {
      newLevel += 1;
      newExp -= player.maxExp;
      newMaxExp = Math.floor(newMaxExp * 1.5);
      newMaxHp += 20;
      newAtk += 5;
      hp = newMaxHp; 
      addLog(`LEVEL UP! You are now level ${newLevel}.`, 'success');
    }

    setPlayer(prev => ({
      ...prev,
      level: newLevel,
      exp: newExp,
      maxExp: newMaxExp,
      maxHp: newMaxHp,
      hp: hp,
      atk: newAtk,
      gold: newGold
    }));

    if (defeatedEnemy.isBoss) {
      triggerEnding(true);
    } else {
      setTimeout(() => {
        setEnemy(null);
        setPhase(GamePhase.MAP);
      }, 1500);
    }
  };

  const handleDefeat = () => {
    addLog("You have fallen...", 'danger');
    triggerEnding(false);
  };

  const runAway = () => {
    if (enemy?.isBoss) {
        addLog("Cannot escape the Demon King!", 'danger');
        return;
    }
    if (Math.random() > 0.4) {
        addLog("You ran away safely!", 'info');
        setEnemy(null);
        setPhase(GamePhase.MAP);
        // Note: The enemy remains on map. If you step back, you fight again.
    } else {
        addLog("Failed to escape!", 'danger');
        if (enemy) setTimeout(() => enemyTurn(enemy.hp), 500);
    }
  }

  const triggerEnding = async (victory: boolean) => {
    setLoading(true);
    const text = await generateEndingStory(player.name, victory);
    setStoryText(text);
    setPhase(victory ? GamePhase.ENDING : GamePhase.GAME_OVER);
    setLoading(false);
  };
  
  const resetGame = () => {
    setPhase(GamePhase.LOGIN);
    setPlayer({ ...INITIAL_PLAYER });
    setEnemy(null);
    setLogs([]);
    setStoryText('');
    setTownMessage('');
    setLoginId('');
    setLoginPw('');
    
    // Regenerate Map and Entities
    const newMap = generateMap();
    mapRef.current = newMap;
    setMapEntities(spawnEnemies(newMap));
    lastProcessedPos.current = { ...INITIAL_PLAYER.position };
  };

  const handleHeal = () => {
    if (player.hp >= player.maxHp) {
        setTownMessage("Health is full.");
        return;
    }
    if (player.potions > 0) {
      const healAmount = Math.floor(player.maxHp * 0.5);
      setPlayer(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + healAmount),
        potions: prev.potions - 1
      }));
      setTownMessage(`Recovered ${healAmount} HP!`);
      addLog(`Used potion. +${healAmount} HP.`, 'success');
    } else {
      setTownMessage("No potions left!");
    }
  };

  const buyPotion = () => {
    if (player.gold >= 50) {
      setPlayer(prev => ({
        ...prev,
        gold: prev.gold - 50,
        potions: prev.potions + 1
      }));
      setTownMessage("Bought a Potion.");
    } else {
      setTownMessage("Not enough Gold (50G).");
    }
  };

  // --- Rendering ---

  // Get visible map section
  const getVisibleMap = () => {
      const startX = Math.max(0, Math.min(player.position.x - Math.floor(VIEWPORT_WIDTH / 2), MAP_WIDTH - VIEWPORT_WIDTH));
      const startY = Math.max(0, Math.min(player.position.y - Math.floor(VIEWPORT_HEIGHT / 2), MAP_HEIGHT - VIEWPORT_HEIGHT));

      const rows = [];
      for(let y=0; y<VIEWPORT_HEIGHT; y++) {
          const row = [];
          for(let x=0; x<VIEWPORT_WIDTH; x++) {
              row.push(mapRef.current[startY + y][startX + x]);
          }
          rows.push(row);
      }

      return { startX, startY, rows };
  };

  const getTileRender = (type: TileType, x: number, y: number) => {
      const isPlayer = player.position.x === x && player.position.y === y;
      
      // Check for entities at this position
      const entity = mapEntities.find(e => e.position.x === x && e.position.y === y);

      let content = '';
      let bgClass = '';
      let borderColor = '';

      // Enhanced Visuals for Tile Types
      switch(type) {
          case TileType.GRASS: 
              bgClass = 'bg-green-600'; 
              borderColor = 'border-green-700';
              if ((x+y)%3===0) content = '🌿'; 
              break;
          case TileType.FOREST: 
              bgClass = 'bg-emerald-800'; 
              borderColor = 'border-emerald-900';
              content = '🌲'; 
              break;
          case TileType.TREE: 
              bgClass = 'bg-green-900'; 
              borderColor = 'border-green-950';
              content = '🌳'; 
              break;
          case TileType.SAND: 
              bgClass = 'bg-yellow-600'; 
              borderColor = 'border-yellow-700';
              if ((x+y)%4===0) content = '🌵';
              break;
          case TileType.MOUNTAIN: 
              bgClass = 'bg-slate-600'; 
              borderColor = 'border-slate-700';
              content = '⛰️'; 
              break;
          case TileType.WATER: 
              bgClass = 'bg-blue-500'; 
              borderColor = 'border-blue-600';
              content = '🌊'; 
              break;
          case TileType.TOWN: 
              bgClass = 'bg-amber-700'; 
              borderColor = 'border-amber-800';
              content = '🏠'; 
              break;
          case TileType.DUNGEON_FLOOR: 
              bgClass = 'bg-stone-800'; 
              borderColor = 'border-stone-900';
              break;
          case TileType.BOSS_FLOOR: 
              bgClass = 'bg-red-950'; 
              borderColor = 'border-red-900';
              break;
          default:
              bgClass = 'bg-gray-900';
      }
      
      if (type === TileType.DUNGEON_FLOOR) {
          bgClass = 'bg-slate-800';
      }

      return (
          <div key={`${x}-${y}`} 
               className={`w-12 h-12 md:w-16 md:h-16 border ${borderColor} flex items-center justify-center text-2xl md:text-3xl relative ${bgClass} shadow-sm`}>
              {/* Tile Content (Plants etc) */}
              <span className="opacity-60 select-none absolute">{content}</span>
              
              {/* Entity (Monster/Boss) Layer */}
              {entity && (
                  <span className="z-10 animate-pulse drop-shadow-md select-none">{entity.emoji}</span>
              )}

              {/* Player Layer */}
              {isPlayer && <span className="absolute inset-0 flex items-center justify-center z-20 animate-bounce drop-shadow-lg scale-125">🧙‍♂️</span>}
          </div>
      );
  };

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
        <h1 className="text-4xl font-bold mb-6 text-center text-blue-400 fantasy-font">Isekai Chronicles</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Adventurer ID</label>
            <input 
              type="text" 
              className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="HeroName"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="******"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Summoning...' : 'Enter World'}
          </Button>
        </form>
      </div>
    </div>
  );

  const renderStory = (title: string, buttonText: string, onNext: () => void) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8 animate-fade-in">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h2 className="text-3xl font-bold text-amber-500 fantasy-font">{title}</h2>
        <p className="text-lg leading-relaxed text-slate-300 whitespace-pre-line text-left bg-slate-900/50 p-6 rounded-lg">
          {storyText}
        </p>
        <Button onClick={onNext} size="lg" variant={phase === GamePhase.GAME_OVER ? "danger" : "primary"}>
          {buttonText}
        </Button>
      </div>
    </div>
  );

  const renderViewport = () => {
      const { startX, startY, rows } = getVisibleMap();
      
      return (
        <div className="flex flex-col items-center justify-center p-2 relative">
            <div className="bg-slate-950 p-1 rounded-lg border-4 border-slate-600 shadow-2xl">
                {rows.map((row, relativeY) => (
                    <div key={relativeY} className="flex">
                        {row.map((tile, relativeX) => getTileRender(tile, startX + relativeX, startY + relativeY))}
                    </div>
                ))}
            </div>
            
            <div className="mt-2 text-center text-slate-400 text-sm">
                Position: ({player.position.x}, {player.position.y})
            </div>

            {/* Mobile D-Pad */}
            <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(0, -1)}>⬆️</Button>
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(-1, 0)}>⬅️</Button>
                 <div className="text-center flex items-center justify-center text-xs text-slate-500 font-bold">MOVE</div>
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(1, 0)}>➡️</Button>
                 <div />
                 <Button size="lg" className="h-16 w-16 text-2xl" onClick={() => movePlayer(0, 1)}>⬇️</Button>
                 <div />
            </div>
        </div>
      );
  };

  const renderTownModal = () => (
      <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-600 rounded-lg p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-3xl font-bold text-amber-500 mb-4 text-center fantasy-font">Town Square</h2>
              
              <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded mb-4 text-base font-mono text-amber-300">
                   <span>💰 {player.gold}G</span>
                   <span>🧪 {player.potions}</span>
              </div>
              
              <div className="space-y-4">
                  <div className="bg-slate-900 p-4 rounded text-slate-300 mb-2 min-h-[4rem] flex items-center justify-center text-center">
                      {townMessage || "\"Welcome, traveler.\""}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                       <Button className="w-full" variant="outline" onClick={handleHeal}>
                          Heal (1 Potion)
                      </Button>
                      <Button className="w-full" variant="outline" onClick={buyPotion}>
                          Buy Potion (50G)
                      </Button>
                  </div>
 
                  <Button className="w-full mt-4 py-3" variant="primary" onClick={leaveTown}>
                      Depart Town
                  </Button>
              </div>
          </div>
      </div>
  );

  const renderCombat = () => (
    <div className="flex flex-col h-full absolute inset-0 bg-slate-900 z-40">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950">
        
        {/* Monster Visualization - Big Emoji */}
        <div className="z-10 flex flex-col items-center animate-fade-in">
             <div className="text-8xl md:text-9xl mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-bounce" style={{ animationDuration: '3s' }}>
                 {enemy?.emoji || '👾'}
             </div>

             <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl border border-slate-600 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                    <h3 className={`text-2xl font-bold ${enemy?.isBoss ? 'text-red-500' : 'text-white'}`}>{enemy?.name}</h3>
                    {enemy?.isBoss && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">BOSS</span>}
                </div>
                <p className="text-slate-400 mb-4 italic">{enemy?.description}</p>
                <ProgressBar current={enemy?.hp || 0} max={enemy?.maxHp || 100} colorClass="bg-red-600" label="Enemy HP" />
             </div>
        </div>
      </div>

      {/* Combat Log */}
      <div className="h-40 bg-black/60 overflow-y-auto p-4 border-t border-slate-700">
         {logs.slice(-5).map(log => (
             <div key={log.id} className={`text-sm mb-1 ${log.type === 'danger' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                 {log.text}
             </div>
         ))}
         <div ref={combatLogRef} />
      </div>

      {/* Actions */}
      <div className="bg-slate-800 p-4 pb-8 border-t border-slate-700">
        <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-4 text-lg font-bold">
                 <div className="text-green-400">HP: {player.hp}/{player.maxHp}</div>
                 <Button onClick={runAway} variant="outline" size="sm">🏃 Run Away</Button>
             </div>
            <div className="flex gap-4 w-full h-16">
                <Button onClick={handleAttack} className="flex-1 text-xl" variant="danger">
                    ⚔️ ATTACK
                </Button>
                <Button onClick={handleHeal} className="w-1/3 text-lg" variant="secondary" title="Use Potion">
                    🧪 Heal ({player.potions})
                </Button>
            </div>
        </div>
      </div>
    </div>
  );

  // --- Main Layout ---

  const isGameActive = phase === GamePhase.MAP || phase === GamePhase.TOWN || phase === GamePhase.COMBAT;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col relative overflow-hidden">
      {phase === GamePhase.LOGIN ? (
        renderLogin()
      ) : (
        <>
          {/* Header Status Bar */}
          {isGameActive && (
             <header className="bg-slate-950 p-3 border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-5xl mx-auto flex justify-between items-center text-sm md:text-base">
                    <div className="flex items-center gap-3">
                        <span className="text-amber-500 font-bold fantasy-font text-lg hidden sm:inline">Isekai Chronicles</span>
                        <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-mono text-blue-300">
                            Lv.{player.level} {player.name}
                        </div>
                    </div>
                    
                    <div className="flex gap-4 font-mono font-bold">
                        <div className="flex items-center text-red-400">
                             ❤️ {player.hp}
                        </div>
                        <div className="flex items-center text-amber-400">
                             💰 {player.gold}
                        </div>
                    </div>
                </div>
            </header>
          )}

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full">
            {phase === GamePhase.INTRO && renderStory("The Summoning", "Begin Adventure", startGame)}
            
            {(phase === GamePhase.MAP || phase === GamePhase.TOWN) && renderViewport()}
            {phase === GamePhase.TOWN && renderTownModal()}
            {phase === GamePhase.COMBAT && renderCombat()}
            
            {phase === GamePhase.ENDING && renderStory("Victory!", "Play Again", resetGame)}
            {phase === GamePhase.GAME_OVER && renderStory("Game Over", "Try Again", resetGame)}
          </main>
          
           {/* Global Log (Overlay on Map) */}
           {phase === GamePhase.MAP && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 h-32 overflow-y-auto text-xs font-mono border-t border-slate-700 pointer-events-none z-20">
                {logs.slice(-8).map((log) => (
                  <div key={log.id} className={`mb-1 ${log.type === 'danger' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                    {log.text}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default App;