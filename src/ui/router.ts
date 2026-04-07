import type { AppView } from "../types";

export interface AppContext {
  router: Router;
  bus: EventTarget;
}

export interface ViewModule {
  render(container: HTMLElement, ctx: AppContext, params?: Record<string, string>): void;
  destroy(): void;
}

export class Router {
  private container: HTMLElement;
  private ctx: AppContext;
  private currentView: ViewModule | null = null;
  private views = new Map<AppView, ViewModule>();

  constructor(container: HTMLElement, bus: EventTarget) {
    this.container = container;
    this.ctx = { router: this, bus };
  }

  register(name: AppView, view: ViewModule) {
    this.views.set(name, view);
  }

  navigate(name: AppView, params?: Record<string, string>) {
    if (this.currentView) {
      this.currentView.destroy();
    }

    this.container.innerHTML = "";
    const view = this.views.get(name);
    if (!view) {
      console.error(`View not found: ${name}`);
      return;
    }

    this.currentView = view;

    // Small delay for transition
    requestAnimationFrame(() => {
      view.render(this.container, this.ctx, params);
      this.container.classList.add("page-fade-enter");
      requestAnimationFrame(() => {
        this.container.classList.remove("page-fade-enter");
        this.container.classList.add("page-fade-active");
        setTimeout(() => this.container.classList.remove("page-fade-active"), 200);
      });
    });
  }
}
