// THEME: next-themes' settings, shared by the root layout and the 404 page (which skips the layout,
// TL-298), so both follow the theme you chose: light, dark or the system's (TL-585).
export const THEME = { attribute: 'class', defaultTheme: 'system', enableSystem: true, disableTransitionOnChange: true, storageKey: 'tracklines-theme' } as const;
