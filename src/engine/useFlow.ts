import { useState, useRef, useCallback, useEffect } from "react";
import type { FlowConfig, FlowState, ABVariants } from "../types/flow";
import { FlowRunner } from "./FlowRunner";

export function useFlow(config: FlowConfig) {
  const runnerRef = useRef<FlowRunner | null>(null);

  if (!runnerRef.current) {
    runnerRef.current = new FlowRunner(config);
  }

  const runner = runnerRef.current;
  const [state, setState] = useState<FlowState>(runner.snapshot);

  useEffect(() => {
    const unsub = runner.subscribe(setState);
    runner.fireInitialEvents();
    return unsub;
  }, [runner]);

  const next = useCallback(
    (answer?: string | string[]) => runner.next(answer),
    [runner],
  );

  const back = useCallback(() => runner.back(), [runner]);

  const resolveText = useCallback(
    (base: string, variants?: ABVariants) => runner.resolveText(base, variants),
    [runner],
  );

  const reset = useCallback(() => runner.reset(), [runner]);

  return {
    state,
    currentStep: config.steps[state.currentStepIndex],
    progress: (state.currentStepIndex + 1) / config.steps.length,
    canGoBack: state.history.length > 0,
    answers: state.answers,
    next,
    back,
    resolveText,
    reset,
  };
}
