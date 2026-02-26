import { useFlow } from "./engine/useFlow";
import { ScreenRouter } from "./screens/ScreenRouter";
import flowConfig from "./config/flow.json";
import type { FlowConfig } from "./types/flow";

const config = flowConfig as FlowConfig;

export function App() {
  const { currentStep, progress, canGoBack, next, back, resolveText, reset } =
    useFlow(config);

  return (
    <>
      <ScreenRouter
        step={currentStep}
        onNext={next}
        onBack={back}
        resolveText={resolveText}
        progress={progress}
        canGoBack={canGoBack}
        flowId={config.id}
      />
      {import.meta.env.DEV && (
        <button
          onClick={reset}
          style={{
            position: "fixed",
            bottom: 8,
            right: 8,
            background: "rgba(255,0,0,0.2)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            cursor: "pointer",
            zIndex: 9999,
          }}
        >
          Reset Flow
        </button>
      )}
    </>
  );
}
