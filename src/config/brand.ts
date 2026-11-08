// Change the name and logo here. Colours live in src/styles/theme.css. Nothing else needs editing.
export const brand = {
  name: "Business OS",
  // Any image in /public. An SVG stays sharp at every size.
  logo: "/logo.svg",
  // The default logo is black, so it's flipped to white in dark mode. Set false for a coloured logo.
  invertLogoInDark: true,
  // Shown on the terms and privacy pages for questions. Set it before going live; empty hides the line.
  contactEmail: "",
} as const;
