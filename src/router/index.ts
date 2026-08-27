import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/search', name: 'search', component: () => import('../views/SearchView.vue') },
    { path: '/batch', name: 'batch', component: () => import('../views/BatchView.vue') },
    { path: '/categories', name: 'categories', component: () => import('../views/CategoriesView.vue') },
    { path: '/shelf', name: 'shelf', component: () => import('../views/ShelfView.vue') },
    { path: '/kind/:kind', name: 'kind', component: () => import('../views/CollectionView.vue') },
    { path: '/item/:id', name: 'item', component: () => import('../views/ItemView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
