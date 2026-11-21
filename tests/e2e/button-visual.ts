import "@fontsource/epilogue/400.css";
import "@fontsource/epilogue/500.css";
import "@fontsource/epilogue/600.css";
import "@m3e/web/theme";
import "@m3e/web/button";
import { createApp } from "vue";
import ButtonVisualFixture from "./ButtonVisualFixture.vue";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/controls.css";

const scheme =
  new URLSearchParams(window.location.search).get("scheme") === "light"
    ? "light"
    : "dark";
document.documentElement.dataset.theme = scheme;

for (const element of [
  document.documentElement,
  document.body,
  document.querySelector<HTMLElement>("#app"),
]) {
  if (!element) continue;
  element.style.height = "auto";
  element.style.overflow = "visible";
}
document.body.style.overflow = "auto";

createApp(ButtonVisualFixture, { scheme }).mount("#app");
