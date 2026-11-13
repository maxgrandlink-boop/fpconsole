import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';

/** Naive 默认深色。布局和页面不要另写颜色。 */
export const theme = darkTheme;

/**
 * 换主题只改这个对象。
 * 当前为空，走 Naive 默认深色 token。
 */
export const themeOverrides: GlobalThemeOverrides = {};
