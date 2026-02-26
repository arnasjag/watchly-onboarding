import type {
  FlowConfig,
  FlowState,
  StepConfig,
  ABVariants,
  ConditionalNext,
} from "../types/flow";
import { getOrAssignVariant } from "./abTest";
import { track } from "./analytics";

export class FlowRunner {
  private config: FlowConfig;
  private state: FlowState;
  private listeners: Set<(state: FlowState) => void> = new Set();

  constructor(config: FlowConfig) {
    this.config = config;
    this.state = this.loadOrInit();
  }

  private loadOrInit(): FlowState {
    const key = `flow:${this.config.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FlowState;
        // Validate index is in range
        if (
          parsed.currentStepIndex >= 0 &&
          parsed.currentStepIndex < this.config.steps.length
        ) {
          return parsed;
        }
      } catch {
        /* fall through */
      }
    }
    return {
      flowId: this.config.id,
      currentStepIndex: 0,
      history: [],
      answers: {},
      variant: getOrAssignVariant(this.config.id),
      startedAt: Date.now(),
    };
  }

  private persist(): void {
    localStorage.setItem(`flow:${this.config.id}`, JSON.stringify(this.state));
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  subscribe(fn: (state: FlowState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get currentStep(): StepConfig {
    return this.config.steps[this.state.currentStepIndex];
  }

  get progress(): number {
    return (this.state.currentStepIndex + 1) / this.config.steps.length;
  }

  get canGoBack(): boolean {
    return this.state.history.length > 0;
  }

  get answers(): Record<string, string | string[]> {
    return this.state.answers;
  }

  get variant(): string {
    return this.state.variant;
  }

  get snapshot(): FlowState {
    return { ...this.state };
  }

  private findStepIndex(stepId: string): number {
    const idx = this.config.steps.findIndex((s) => s.id === stepId);
    if (idx === -1) throw new Error(`Step "${stepId}" not found`);
    return idx;
  }

  private resolveNextId(step: StepConfig): string {
    const { next } = step;
    if (typeof next === "string") return next;
    for (const cond of next as ConditionalNext[]) {
      const answer = this.state.answers[cond.condition.stepId];
      if (
        answer === cond.condition.answerId ||
        (Array.isArray(answer) && answer.includes(cond.condition.answerId))
      ) {
        return cond.next;
      }
    }
    return (next as ConditionalNext[])[next.length - 1].next;
  }

  next(answer?: string | string[]): void {
    const current = this.currentStep;
    if (answer !== undefined) {
      this.state.answers[current.id] = answer;
    }

    track({
      type: "step_completed",
      flowId: this.state.flowId,
      stepId: current.id,
      timestamp: Date.now(),
      variant: this.state.variant,
      answer,
    });

    const nextId = this.resolveNextId(current);
    if (!nextId) return; // end of flow

    const nextIndex = this.findStepIndex(nextId);
    this.state.history.push(this.state.currentStepIndex);
    this.state.currentStepIndex = nextIndex;
    this.persist();

    track({
      type: "step_viewed",
      flowId: this.state.flowId,
      stepId: this.currentStep.id,
      timestamp: Date.now(),
      variant: this.state.variant,
    });
  }

  back(): void {
    if (!this.canGoBack) return;
    const prev = this.state.history.pop()!;
    this.state.currentStepIndex = prev;
    this.persist();

    track({
      type: "step_back",
      flowId: this.state.flowId,
      stepId: this.currentStep.id,
      timestamp: Date.now(),
      variant: this.state.variant,
    });
  }

  reset(): void {
    localStorage.removeItem(`flow:${this.config.id}`);
    this.state = this.loadOrInit();
    this.persist();
  }

  resolveText(base: string, variants?: ABVariants): string {
    if (!variants) return base;
    return variants[this.state.variant] ?? base;
  }

  fireInitialEvents(): void {
    track({
      type: "flow_started",
      flowId: this.state.flowId,
      stepId: this.currentStep.id,
      timestamp: Date.now(),
      variant: this.state.variant,
    });
    track({
      type: "step_viewed",
      flowId: this.state.flowId,
      stepId: this.currentStep.id,
      timestamp: Date.now(),
      variant: this.state.variant,
    });
  }
}
