/**
 * The people behind the picks. Edit freely: this is display copy only.
 * Keep it to style and focus. Don't add win rates or profit figures here;
 * results shown in the app come from the settled tips (Album > Track record).
 */
export interface Tipster {
  id: string;
  name: string;
  role: string;
  /** Frame colour of the tipster card. */
  color: string;
  focus: string[];
  signature: string;
  style: string;
  quote: string;
}

export const TIPSTERS: Tipster[] = [
  {
    id: "adam",
    name: "Adam",
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
    name: "Peter",
    role: "The Specialist",
    color: "#c2412d",
    focus: ["Tennis", "NBA", "Serie A"],
    signature: "Handicaps",
    style:
      "Reads the matchup and the schedule: surfaces, fatigue, travel and rotation. Looks for spots where the market hasn't caught up with what's happening on court.",
    quote: "Find the spot before the market does.",
  },
];
