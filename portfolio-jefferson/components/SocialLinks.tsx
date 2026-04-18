"use client";

import { Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";

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
  {
    label: "Email",
    href: "mailto:jeffersonkirigaya@gmail.com",
    icon: Mail,
  },
];

export default function SocialLinks() {
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
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            aria-label={label}
            className="group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/40 text-subtle transition-all duration-300 hover:border-accent/60 hover:text-foreground hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)]"
          >
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </a>
        </motion.li>
      ))}
    </ul>
  );
}