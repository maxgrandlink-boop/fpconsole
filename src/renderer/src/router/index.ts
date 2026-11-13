import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import AppShell from '../layouts/AppShell.vue';
import EnvView from '../views/EnvView.vue';
import ProxyView from '../views/ProxyView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/env' },
      { path: 'env', name: 'env', component: EnvView, meta: { title: '环境管理' } },
      { path: 'proxy', name: 'proxy', component: ProxyView, meta: { title: '代理管理' } },
      { path: 'settings', name: 'settings', component: SettingsView, meta: { title: '设置' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/env' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
