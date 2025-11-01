import { MoveRight, PhoneCall } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function Hero() {
  return (
    <div className="w-full  py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-8 items-center lg:grid-cols-2">
          <div className="flex gap-4 flex-col">
            <div>
              <Badge variant="outline" className="inline-flex items-center gap-2 px-3 py-1.5">
                <Image src="/Centryx.svg" alt="CenTryx" width={18} height={18} />
                <span className="text-sm font-medium">CenTryx</span>
              </Badge>
            </div>
            <div className="flex gap-4 flex-col">
              <h1 className="text-5xl md:text-7xl max-w-lg tracking-tighter text-left font-regular">
              Master your money with AI.
              </h1>
              <p className="text-xl leading-relaxed tracking-tight text-muted-foreground max-w-md text-left">
              Managing multiple bank accounts, e-wallets, and investments can be overwhelming. Our AI-powered finance platform unifies your cash flow, automates accounting, and predicts what’s next — helping you make smarter financial decisions effortlessly.
              </p>
            </div>
            <div className="flex flex-row gap-4">
              <Button size="lg" className="gap-4" variant="outline">
                Jump on a call <PhoneCall className="w-4 h-4" />
              </Button>
              <Button asChild size="lg" className="gap-4">
                <Link href="/auth">
                  Sign up here <MoveRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
          {/* Replace the placeholder with an Unsplash image background */}
          <div
            className="rounded-md aspect-square bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop')",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export { Hero };


