import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { piniaPersistPlugin } from './plugins/piniaPersist';
import './style.css';

declare const __COMMIT_SHA__: string;
console.log(`Fractr ${__COMMIT_SHA__}`);

const pinia = createPinia();
pinia.use(piniaPersistPlugin);

const app = createApp(App);
app.use(pinia);
app.mount('#app');
