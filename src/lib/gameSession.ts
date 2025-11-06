/* Utility for managing per-game sessions and shareable links via ?game=ID */

const CURRENT_GAME_KEY = "lpgp_current_game_id";
const SESSION_PREFIX = "lpgp_session"; // lpgp_session:<gameId>

// Generate a short-ish UUID v4
function generateId() {
  if (crypto && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCurrentGameId(): string | null {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("game");
  if (fromQuery) return fromQuery;
  return localStorage.getItem(CURRENT_GAME_KEY);
}

export function setCurrentGameId(gameId: string) {
  localStorage.setItem(CURRENT_GAME_KEY, gameId);
}

export function ensureGameInUrl(): string {
  const url = new URL(window.location.href);
  let gameId = url.searchParams.get("game");
  if (!gameId) {
    gameId = generateId();
    url.searchParams.set("game", gameId);
    window.history.replaceState({}, "", url.toString());
  }
  setCurrentGameId(gameId);
  return gameId;
}

export async function createNewGameAndNavigate(): Promise<string> {
  const url = new URL(window.location.href);
  const newId = generateId();
  url.searchParams.set("game", newId);
  // Clear any existing session for the new game (fresh start)
  const sessionKey = `${SESSION_PREFIX}:${newId}`;
  localStorage.removeItem(sessionKey);
  setCurrentGameId(newId);
  window.history.pushState({}, "", url.toString());
  // Initialize server-side game row if using real Supabase
  try {
    const { supabase, isMockSupabase } = await import("./supabase");
    if (!isMockSupabase) {
      await supabase.rpc("ensure_game", { p_game_id: newId });
    }
  } catch {
    // no-op if supabase import fails during build
  }
  // Touch the app to initialize mock storage by reading dashboard later
  return newId;
}

export function getShareUrl(): string {
  const url = new URL(window.location.href);
  const gameId = ensureGameInUrl();
  url.searchParams.set("game", gameId);
  return url.toString();
}

export interface GameSession {
  playerId?: string;
  observer?: boolean;
}

export function getSession(gameId?: string): GameSession | null {
  const gid = gameId || getCurrentGameId();
  if (!gid) return null;
  const raw = localStorage.getItem(`${SESSION_PREFIX}:${gid}`);
  return raw ? (JSON.parse(raw) as GameSession) : null;
}

export function setSession(session: GameSession, gameId?: string) {
  const gid = gameId || getCurrentGameId();
  if (!gid) throw new Error("No game id");
  localStorage.setItem(`${SESSION_PREFIX}:${gid}`, JSON.stringify(session));
}
