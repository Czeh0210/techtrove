import { Hero } from "@/components/ui/Hero";
import SpotlightCard from "@/components/SpotlightCard";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full items-center justify-center">
        <div className="w-full">
          <Hero />
          <section className="w-full py-12 md:py-16">
            <div className="container mx-auto px-4">
              <h2 className="mb-6 text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                ⚙️ Core Function (Base System)
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <SpotlightCard className="bg-white dark:bg-zinc-900" spotlightColor="rgba(0, 229, 255, 0.2)">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Centralized Transaction Aggregation
                  </h3>
                  <ul className="mt-3 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5">
                    <li>Connect and sync bank, card, and e‑wallets (APIs/Open Banking)</li>
                    <li>Real‑time inflow/outflow updates</li>
                    <li>Auto‑categorize transactions (bills, salary, subscriptions)</li>
                  </ul>
                </SpotlightCard>

                <SpotlightCard className="bg-white dark:bg-zinc-900" spotlightColor="rgba(0, 229, 255, 0.2)">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    AI‑Based Cash Flow Management
                  </h3>
                  <ul className="mt-3 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5">
                    <li>Predict future balance and shortages</li>
                    <li>Visualize monthly/quarterly trends</li>
                    <li>Alerts for unusual expenses or upcoming bills</li>
                  </ul>
                </SpotlightCard>

                <SpotlightCard className="bg-white dark:bg-zinc-900" spotlightColor="rgba(0, 229, 255, 0.2)">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Accounting Automation
                  </h3>
                  <ul className="mt-3 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5">
                    <li>Generate income statements and cash‑flow reports</li>
                    <li>Tag and reconcile personal/business transactions</li>
                    <li>Export CSV, Excel, QuickBooks</li>
                  </ul>
                </SpotlightCard>
              </div>
            </div>
          </section>
          <Footer
            className="bg-background"
            brand={{
              name: "CenTryx",
              description:
                "AI‑powered finance platform that unifies cash flow, automates accounting, and predicts what’s next.",
            }}
            socialLinks={[
              { name: "GitHub", href: "#" },
              { name: "LinkedIn", href: "#" },
              { name: "Contact", href: "mailto:hello@centryx.app" },
            ]}
            columns={[
              {
                title: "Product",
                links: [
                  { name: "Dashboard", iconName: "LayoutDashboard", href: "/dashboard" },
                  { name: "Login", iconName: "LogIn", href: "/auth" },
                  { name: "Register", iconName: "UserPlus", href: "/register" },
                  { name: "Security", iconName: "ShieldCheck", href: "#" },
                ],
              },
              {
                title: "Features",
                links: [
                  { name: "Aggregation", iconName: "Wallet", href: "#" },
                  { name: "AI Cash Flow", iconName: "TrendingUp", href: "#" },
                  { name: "Accounting", iconName: "FileText", href: "#" },
                  { name: "Payments", iconName: "CreditCard", href: "#" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { name: "Docs", iconName: "BookOpen", href: "#" },
                  { name: "GitHub", iconName: "Github", href: "#" },
                  { name: "LinkedIn", iconName: "Linkedin", href: "#" },
                  { name: "Support", iconName: "Mail", href: "mailto:hello@centryx.app" },
                ],
              },
            ]}
            copyright={`© ${new Date().getFullYear()} CenTryx. All rights reserved.`}
          />
        </div>
      </main>
    </div>
  );
}
