import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./host/App.vue";

createApp(App).use(createPinia()).mount("#app");
