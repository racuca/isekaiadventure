export enum GamePhase {
  LOGIN = 'LOGIN',
  INTRO = 'INTRO',
  MAP = 'MAP', // New phase for walking around
  TOWN = 'TOWN', // Shopping/Resting menu (overlay or separate screen)
  COMBAT = 'COMBAT', // Active fighting
  ENDING = 'ENDING',
  GAME_OVER = 'GAME_OVER'
}

export enum TileType {
  GRASS = 0,
  TREE = 1, // Wall
  MOUNTAIN = 2, // Wall
  TOWN = 3,
  DUNGEON_FLOOR = 4, // Dark stone
  BOSS_FLOOR = 5, // Just visual now
  WATER = 6, // Wall
  SAND = 7,
  FOREST = 8
}

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  exp: number;
  maxExp: number;
  gold: number;
  potions: number;
  position: Position;
}

// Entity on the map (Visible Monster)
export interface MapEntity {
  id: string;
  type: 'SLIME' | 'GOBLIN' | 'WOLF' | 'SKELETON' | 'BOSS' | 'UNKNOWN';
  name: string;
  emoji: string;
  position: Position;
  zone: string;
  isBoss: boolean;
}

export interface Enemy {
  id?: string; // Link to map entity
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  expReward: number;
  goldReward: number;
  description: string;
  emoji: string;
  isBoss?: boolean;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'combat' | 'danger' | 'success';
}