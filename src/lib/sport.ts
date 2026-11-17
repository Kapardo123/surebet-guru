/** Colour identity per sport, used for card frames and art windows. */
export interface SportTheme {
  hue: number;
  frame: string; // solid frame colour
  art: string; // CSS background for the art window
}

const make = (hue: number, sat = 62, light = 42): SportTheme => ({
  hue,
  frame: `hsl(${hue} ${sat}% ${light}%)`,
  art: `radial-gradient(120% 90% at 30% 20%, hsl(${hue} ${sat + 10}% ${light + 16}%), hsl(${hue} ${sat}% ${light - 8}%) 60%, hsl(${hue + 20} ${sat}% ${light - 20}%))`,
});

export const sportTheme = (sport?: string | null): SportTheme => {
  const s = (sport || "").toLowerCase();
  if (s.includes("tennis")) return make(78, 60, 40);
  if (s.includes("basket")) return make(22, 80, 48);
  if (s.includes("hockey")) return make(198, 70, 42);
  if (s.includes("volley")) return make(45, 85, 46);
  if (s.includes("esport") || s.includes("e-sport")) return make(285, 60, 48);
  if (s.includes("mma") || s.includes("box")) return make(355, 70, 46);
  if (s.includes("football") || s.includes("soccer") || !s) return make(150, 55, 34);
  return make(250, 55, 50);
};
