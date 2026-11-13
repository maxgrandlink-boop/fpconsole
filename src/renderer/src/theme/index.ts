import { darkTheme, type GlobalTheme, type GlobalThemeOverrides } from 'naive-ui';
import { themeOverridesDark, themeOverridesLight } from './naive-theme';

export type ThemeMode = 'dark' | 'light';

export { themeOverridesDark, themeOverridesLight };

/** 深色配合 Naive darkTheme。浅色不套 darkTheme，只覆盖 themeOverridesLight。 */
export function naiveThemeFor(mode: ThemeMode): GlobalTheme | null {
  return mode === 'dark' ? darkTheme : null;
}

export function themeOverridesFor(mode: ThemeMode): GlobalThemeOverrides {
  return mode === 'dark' ? themeOverridesDark : themeOverridesLight;
}
