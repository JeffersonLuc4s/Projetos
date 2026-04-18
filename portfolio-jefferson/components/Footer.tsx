"use client";

import { motion } from "framer-motion";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <motion.footer
      id="contato"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-between gap-6 border-t border-border pt-10 text-sm text-subtle sm:flex-row"
    >
      <p>
        © {year} Jefferson Lucas. Construído com Next.js, Tailwind e atenção aos detalhes.
      </p>
      <SocialLinks />
    </motion.footer>
  );
}