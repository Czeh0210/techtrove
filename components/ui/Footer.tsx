"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LogIn,
  UserPlus,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  BookOpen,
  Github,
  Linkedin,
  Mail,
  CreditCard,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface SocialLink {
  name: string;
  href: string;
}

interface FooterLink {
  name: string;
  iconName?: keyof typeof IconMap;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterProps extends React.HTMLAttributes<HTMLDivElement> {
  brand: {
    name: string;
    description: string;
  };
  socialLinks: SocialLink[];
  columns: FooterColumn[];
  copyright?: string;
}

export const Footer = React.forwardRef<HTMLDivElement, FooterProps>(
  ({ className, brand, socialLinks, columns, copyright, ...props }, ref) => {
    const IconMap = {
      LogIn,
      UserPlus,
      LayoutDashboard,
      ShieldCheck,
      FileText,
      BookOpen,
      Github,
      Linkedin,
      Mail,
      CreditCard,
      Wallet,
      TrendingUp,
    } as const;
    return (
      <div ref={ref} className={cn("pt-24", className)} {...props}>
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <a href="/" className="inline-flex items-center gap-2 text-xl font-semibold text-primary">
                <Image src="/Centryx.svg" alt={brand.name} width={28} height={28} priority />
                {brand.name}
              </a>
              <p className="mt-2 text-sm text-foreground/60">
                {brand.description}
              </p>
              <p className="text-sm font-light text-foreground/55 mt-3.5">
                {socialLinks.map((link, index) => (
                  <React.Fragment key={link.name}>
                    <a
                      className="hover:text-foreground/90"
                      target="_blank"
                      href={link.href}
                      rel="noopener noreferrer"
                    >
                      {link.name}
                    </a>
                    {index < socialLinks.length - 1 && " • "}
                  </React.Fragment>
                ))}
              </p>
            </div>
            <div className="grid grid-cols-2 mt-4 md:grid-cols-3 lg:col-span-8 lg:justify-items-end lg:mt-0 gap-8">
              {columns.map(({ title, links }) => (
                <div key={title} className="last:mt-12 md:last:mt-0">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {links.map(({ name, iconName, href }) => {
                      const IconComp = iconName ? IconMap[iconName] : undefined;
                      return (
                        <li key={name}>
                          <a
                            href={href || "#"}
                            className="text-sm transition-all text-foreground/60 hover:text-foreground/90 group"
                          >
                            {IconComp ? (
                              <IconComp className="inline stroke-2 h-4 mr-1.5 transition-all stroke-foreground/60 group-hover:stroke-foreground/90" />
                            ) : null}
                            {name}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          {copyright && (
            <div className="mt-20 border-t pt-6 pb-8">
              <p className="text-xs text-foreground/55">{copyright}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Footer.displayName = "Footer";


