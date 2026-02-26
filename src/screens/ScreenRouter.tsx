import type { StepConfig, ABVariants } from "../types/flow";
import { SingleChoice } from "./SingleChoice";
import { MultiChoice } from "./MultiChoice";
import { InfoBenefit } from "./InfoBenefit";
import { Paywall } from "./Paywall";
import { Loading } from "./Loading";
import { Success } from "./Success";

interface Props {
  step: StepConfig;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: ABVariants) => string;
  progress: number;
  canGoBack: boolean;
  flowId: string;
}

export function ScreenRouter({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
  flowId,
}: Props) {
  const common = { onNext, onBack, resolveText, progress, canGoBack };

  switch (step.type) {
    case "single-choice":
      return <SingleChoice step={step} {...common} key={step.id} />;
    case "multi-choice":
      return <MultiChoice step={step} {...common} key={step.id} />;
    case "info-benefit":
      return <InfoBenefit step={step} {...common} key={step.id} />;
    case "paywall":
      return <Paywall step={step} {...common} flowId={flowId} key={step.id} />;
    case "loading":
      return <Loading step={step} {...common} key={step.id} />;
    case "success":
      return <Success step={step} {...common} key={step.id} />;
    default:
      return <div>Unknown screen type</div>;
  }
}
