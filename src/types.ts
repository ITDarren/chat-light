export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type ClearingPhase = "discovery" | "definition" | "practice" | "resolved";

export interface ChatSessionState {
  phase: ClearingPhase;
  mode?: "study" | "life";
  misunderstoodWord: string;
  definitions: string[];
  sentenceCount: number;
  suggestions: string[];
  isFallback?: boolean;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  misunderstoodWord: string;
  userFeelings: string;
  vow: string;
  signature: string;
  confidence: number;
  cardSet: { front: string; back: string }[];
}

