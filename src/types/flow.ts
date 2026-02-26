export type ScreenType =
  | "single-choice"
  | "multi-choice"
  | "info-benefit"
  | "paywall"
  | "loading"
  | "success";

export interface ChoiceOption {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface ABVariants {
  [key: string]: string;
}

export interface ConditionalNext {
  condition: { stepId: string; answerId: string };
  next: string;
}

interface BaseStep {
  id: string;
  type: ScreenType;
  title: string;
  title_variants?: ABVariants;
  subtitle?: string;
  subtitle_variants?: ABVariants;
  ctaLabel: string;
  ctaLabel_variants?: ABVariants;
  secondaryLabel?: string;
  next: string | ConditionalNext[];
}

export interface SingleChoiceStep extends BaseStep {
  type: "single-choice";
  options: ChoiceOption[];
}

export interface MultiChoiceStep extends BaseStep {
  type: "multi-choice";
  options: ChoiceOption[];
  minSelections?: number;
  maxSelections?: number;
}

export interface InfoBenefitStep extends BaseStep {
  type: "info-benefit";
  benefits: string[];
  illustration?: string;
}

export interface PaywallStep extends BaseStep {
  type: "paywall";
  features?: string[];
  plans?: {
    id: string;
    label: string;
    priceLabel: string;
    badge?: string;
    priceId?: string;
  }[];
}

export interface LoadingStep extends BaseStep {
  type: "loading";
  duration: number;
  messages: string[];
}

export interface SuccessStep extends BaseStep {
  type: "success";
  message: string;
  deepLinkBase?: string;
}

export type StepConfig =
  | SingleChoiceStep
  | MultiChoiceStep
  | InfoBenefitStep
  | PaywallStep
  | LoadingStep
  | SuccessStep;

export interface FlowConfig {
  id: string;
  version?: number;
  steps: StepConfig[];
}

export interface FlowState {
  flowId: string;
  currentStepIndex: number;
  history: number[];
  answers: Record<string, string | string[]>;
  variant: string;
  startedAt: number;
}
