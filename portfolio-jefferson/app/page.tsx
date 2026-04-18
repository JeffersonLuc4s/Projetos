import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-32 px-6 py-20 sm:px-8 md:gap-40 md:py-28">
      <Hero />
      <Projects />
      <Footer />
    </main>
  );
}