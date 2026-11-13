import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import AppShell from '../layouts/AppShell.vue';
import ComingSoon from '../views/ComingSoon.vue';
import EnvView from '../views/EnvView.vue';
import ProxyView from '../views/ProxyView.vue';
import SystemView from '../views/SystemView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/env' },
      { path: 'env', name: 'env', component: EnvView, meta: { title: '浏览器环境' } },
      { path: 'members', name: 'members', component: ComingSoon, meta: { title: '成员管理' } },
      { path: 'proxy', name: 'proxy', component: ProxyView, meta: { title: '代理管理' } },
      {
        path: 'env-settings',
        name: 'env-settings',
        component: ComingSoon,
        meta: { title: '环境设置' },
      },
      { path: 'system', name: 'system', component: SystemView, meta: { title: '系统设置' } },
      { path: 'settings', redirect: '/system' },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/env' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
