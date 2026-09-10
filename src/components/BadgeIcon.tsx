import { Award, BrainCircuit, Cpu, Flag, Flame, Gamepad2, Landmark, Medal, Sparkles, Trophy, Users, type LucideProps } from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Award,
  BrainCircuit,
  Cpu,
  Flag,
  Flame,
  Gamepad2,
  Landmark,
  Medal,
  Sparkles,
  Trophy,
  Users,
};

export function BadgeIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Award;
  return <Icon aria-hidden="true" {...props} />;
}
