"use client";

import { NavBar } from "@/components/ui/tubelight-navbar";
import { CreditCard, MessageSquare, LayoutDashboard, Crown } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  {
    name: "Card",
    url: "/card",
    icon: CreditCard,
  },
  {
    name: "Chatbot",
    url: "/chatbot",
    icon: MessageSquare,
  },
  {
    name: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Subscription",
    url: "/subscription",
    icon: Crown,
  },
];

export default function Navigation() {
  const pathname = usePathname();
  
  return <NavBar items={navItems} currentPath={pathname} />;
}
