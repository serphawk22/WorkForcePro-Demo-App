import Link from "next/link";
import { Zap, Github, Twitter, Linkedin } from "lucide-react";

const internalLinks = [
  { label: "Login",     href: "/login" },
  { label: "Dashboard", href: "/dashboard" },
];

const anchorLinks = [
  { label: "Features",  href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "AI Vision", href: "#ai-vision" },
];

export function FooterSection() {
  return (
    <footer className="bg-background-soft border-t border-border/50 py-16 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-10 right-20 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-20 w-32 h-32 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
                <Zap size={18} className="text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                WorkForce <span className="text-gradient-primary">Pro</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium workforce management platform for modern teams. Built for clarity, speed, and scale.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Navigation
            </p>
            <ul className="space-y-2.5">
              {internalLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              {anchorLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Connect
            </p>
            <div className="flex gap-3">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="h-10 w-10 rounded-xl glass-card glass-card-hover
                             flex items-center justify-center text-primary
                             transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 WorkForce Pro. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
