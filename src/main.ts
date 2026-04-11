import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { piniaPersistPlugin } from './plugins/piniaPersist';
import './style.css';

const pinia = createPinia();
pinia.use(piniaPersistPlugin);

const app = createApp(App);
app.use(pinia);
app.mount('#app');
