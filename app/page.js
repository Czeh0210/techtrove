import { Hero } from "@/components/ui/Hero";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full items-center justify-center">
        <Hero />
      </main>
    </div>
  );
}
