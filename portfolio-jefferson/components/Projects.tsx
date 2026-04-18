"use client";

import { motion } from "framer-motion";
import ProjectCard, { type Project } from "./ProjectCard";

const projects: Project[] = [
  {
    name: "Colégio Ipuense",
    description:
      "Landing page institucional do colégio, com identidade visual própria, seções de cursos, corpo docente e contato. Foco em layout responsivo e performance.",
    stack: ["HTML", "CSS", "JavaScript", "Vercel"],
    url: "https://colegio-ipuense.vercel.app",
  },
  {
    name: "Fichário D&D Online",
    description:
      "Aplicação para gerenciar fichas de Dungeons & Dragons com autenticação, login e sessão persistente — jogadores retomam de onde pararam.",
    stack: ["Next.js", "TypeScript", "Auth", "Vercel"],
    url: "https://projetos-teal-nine.vercel.app",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export default function Projects() {
  return (
    <section id="projetos" aria-label="Projetos" className="flex flex-col gap-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-2"
      >
        <span className="text-xs uppercase tracking-[0.2em] text-subtle">
          Trabalhos selecionados
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Projetos
        </h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        {projects.map((project, i) => (
          <ProjectCard key={`${project.name}-${i}`} project={project} />
        ))}
      </motion.div>
    </section>
  );
}