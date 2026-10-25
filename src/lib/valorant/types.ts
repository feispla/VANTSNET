// Tipos compartidos entre API y UI de VANTSNET

export interface PlayerInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
}

export interface ProfileAggregate {
  matches: number;
  wins: number;
  winrate: number; // 0-100
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  adr: number;
  acs: number;
  hsPct: number;
}

export interface AgentSummary {
  name: string;
  uuid: string;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  winrate: number;
}

export interface MatchSummary {
  externalId: string;
  mapName: string;
  mode: string;
  modeLabel: string;
  playedAt: string; // ISO
  durationMs: number;
  won: boolean;
  roundsWon: number;
  roundsLost: number;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  hsPct: number;
  agentName: string;
  agentUuid: string;
}

export interface ProfileResponse {
  demo: boolean;
  player: PlayerInfo;
  aggregate: ProfileAggregate;
  agents: AgentSummary[];
  matches: MatchSummary[];
}

export interface MatchPlayerRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  agentName: string;
  agentUuid: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPct: number;
  won: boolean;
}

export interface MatchTeam {
  teamId: string;
  won: boolean;
  roundsWon: number;
  roundsLost: number;
  players: MatchPlayerRow[];
}

export interface MatchDetailResponse {
  demo: boolean;
  externalId: string;
  mapName: string;
  modeLabel: string;
  playedAt: string;
  durationMs: number;
  teams: MatchTeam[];
}
