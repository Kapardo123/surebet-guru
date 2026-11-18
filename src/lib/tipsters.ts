/**
 * The people behind the picks, shown under their nicknames. Edit freely:
 * this is display copy only. Keep it to style and focus. Don't add win rates
 * or profit figures here; results come from the settled tips (Album > Track record).
 * `id` is what's stored in tips.tipster, so don't change it.
 */
export interface Tipster {
  id: "adam" | "peter";
  nick: string;
  role: string;
  /** Frame colour of the tipster card and their tag on tip cards. */
  color: string;
  focus: string[];
  signature: string;
  style: string;
  quote: string;
}

export const TIPSTERS: Tipster[] = [
  {
    id: "adam",
    nick: "xGhost",
    role: "The Analyst",
    color: "#2f6fd6",
    focus: ["Premier League", "La Liga", "Champions League"],
    signature: "Goals markets",
    style:
      "Starts from the numbers: expected goals, shot quality, recent form and how the line has moved. Only puts a card down when the price looks bigger than the chance behind it.",
    quote: "If the numbers and the hype disagree, I side with the numbers.",
  },
  {
    id: "peter",
    nick: "Courtside",
    role: "The Specialist",
    color: "#c2412d",
    focus: ["Tennis", "NBA", "Serie A"],
    signature: "Handicaps",
    style:
      "Reads the matchup and the schedule: surfaces, fatigue, travel and rotation. Looks for spots where the market hasn't caught up with what's happening on court.",
    quote: "Find the spot before the market does.",
  },
];

export const tipsterById = (id?: string | null): Tipster | undefined =>
  id ? TIPSTERS.find((t) => t.id === id) : undefined;
