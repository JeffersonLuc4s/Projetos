"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Download, MessageCircle } from "lucide-react";
import SocialLinks from "./SocialLinks";

export default function Hero() {
  return (
    <section
      id="home"
      aria-label="Apresentação"
      className="flex flex-col items-center gap-12 pt-8 md:flex-row md:items-center md:gap-16 md:pt-16"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative shrink-0"
      >
        <div
          className="absolute -inset-6 rounded-full bg-accent/40 blur-3xl animate-glow-pulse"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-full border border-accent/50 animate-ripple"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-full border border-accent/40 animate-ripple"
          style={{ animationDelay: "1.5s" }}
          aria-hidden="true"
        />
        <div className="relative h-40 w-40 overflow-hidden rounded-full border border-accent/30 bg-surface shadow-[0_0_40px_-4px_rgba(59,130,246,0.35)] md:h-48 md:w-48">
          <Image
            src="/perfil.png"
            alt="Foto de Jefferson Lucas"
            fill
            sizes="(min-width: 768px) 12rem, 10rem"
            className="object-cover"
            priority
          />
        </div>
      </motion.div>

      <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-3 py-1 text-xs text-subtle backdrop-blur-sm"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Disponível para novos projetos
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Jefferson Lucas
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-3 text-lg text-subtle sm:text-xl"
        >
          Desenvolvedor Full Stack
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 max-w-xl text-balance text-sm leading-relaxed text-subtle sm:text-base"
        >
          Construo interfaces modernas e sistemas web com foco em performance,
          acabamento visual e experiência do usuário. Atualmente trabalhando
          com Next.js, TypeScript e Node — explorando integração de agentes
          de IA autônomos em produtos web.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start"
        >
          <a
            href="https://wa.me/5585989264100"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-all duration-300 hover:bg-foreground/90 hover:shadow-[0_0_30px_-8px_rgba(250,250,250,0.5)]"
          >
            Entre em contato
            <MessageCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          </a>

          <a
            href="/curriculo.pdf"
            download
            className="group inline-flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/60 hover:bg-surface/60"
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            Baixar Currículo
          </a>

          <div className="ml-0 md:ml-2">
            <SocialLinks />
          </div>
        </motion.div>
      </div>
    </section>
  );
}