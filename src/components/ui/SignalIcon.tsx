import {
  Activity,
  Award,
  BarChart3,
  Bitcoin,
  Cpu,
  Crown,
  Flame,
  Gauge,
  GitBranch,
  Hexagon,
  Layers,
  LineChart,
  MessageCircle,
  PieChart,
  Radio,
  Sun,
  TrendingUp,
  Users,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity, Award, BarChart3, Bitcoin, Cpu, Crown, Flame, Gauge, GitBranch, Hexagon, Layers, LineChart, MessageCircle, PieChart, Radio, Sun, TrendingUp, Users, Zap,
};

export function SignalIcon({ name, className = "size-4" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Activity;
  return <Icon className={className} aria-hidden />;
}
