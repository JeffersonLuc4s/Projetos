"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export type Project = {
  name: string;
  description: string;
  stack: string[];
  url: string;
};

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const { name, description, stack, url } = project;

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir projeto ${name} em nova aba`}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-surface/40 p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-accent/50 hover:bg-surface/60 hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.35)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), rgba(59,130,246,0.08), transparent 40%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {name}
        </h3>
        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-subtle transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden="true"
        />
      </div>

      <p className="relative text-sm leading-relaxed text-subtle">
        {description}
      </p>

      <ul className="relative mt-2 flex flex-wrap gap-2">
        {stack.map((tech) => (
          <li
            key={tech}
            className="rounded-md border border-border bg-background/40 px-2 py-0.5 text-xs text-subtle"
          >
            {tech}
          </li>
        ))}
      </ul>
    </motion.a>
  );
}