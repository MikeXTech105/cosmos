import { ShieldCheck, BarChart3, Users, Clock } from "lucide-react";

export const AUTH_STATS = [
  { value: "5+", label: "Users" },
  { value: "12", label: "Departments" },
  { value: "99.9%", label: "Uptime" },
];

export const AUTH_FEATURES = [
  {
    icon: ShieldCheck,
    text: "Role-based access control",
  },
  {
    icon: BarChart3,
    text: "Real-time analytics & reporting",
  },
  {
    icon: Users,
    text: "Team approvals & collaboration",
  },
  {
    icon: Clock,
    text: "99.9% uptime SLA",
  },
];
