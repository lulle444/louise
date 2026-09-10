import {
  BrainCircuit,
  Coins,
  Gamepad2,
  Landmark,
  Layers,
  MessageSquareHeart,
  PartyPopper,
  RadioTower,
  ShieldCheck,
  Sparkles,
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  BrainCircuit,
  Coins,
  Gamepad2,
  Landmark,
  Layers,
  MessageSquareHeart,
  PartyPopper,
  RadioTower,
  ShieldCheck,
  Sparkles,
};

export function NarrativeIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}
