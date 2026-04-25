"use client";

import { Check, Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const EMAIL = "jeffersonluc4scontato@gmail.com";

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/JeffersonLuc4s",
    icon: Github,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/jeffersonluc4s/",
    icon: Linkedin,
  },
];

export default function SocialLinks() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  return (
    <ul className="flex items-center gap-3">
      {socials.map(({ label, href, icon: Icon }, i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/40 text-subtle transition-all duration-300 hover:border-accent/60 hover:text-foreground hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)]"
          >
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </a>
        </motion.li>
      ))}

      <motion.li
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + socials.length * 0.08, duration: 0.5 }}
        className="relative"
      >
        <button
          type="button"
          onClick={copyEmail}
          aria-label={copied ? "Email copiado" : `Copiar email ${EMAIL}`}
          title={EMAIL}
          className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/40 text-subtle transition-all duration-300 hover:border-accent/60 hover:text-foreground hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)]"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent" />
          ) : (
            <Mail className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          )}
        </button>

        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface/90 px-2 py-1 text-xs text-foreground shadow-lg backdrop-blur-sm"
          >
            Email copiado!
          </motion.span>
        )}
      </motion.li>
    </ul>
  );
}
