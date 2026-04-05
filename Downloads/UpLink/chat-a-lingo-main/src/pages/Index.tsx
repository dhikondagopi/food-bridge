import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Video, MessageCircle, ArrowRight, Zap, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Video,
    title: "Live video sessions",
    desc: "Practice face-to-face with native speakers in real time.",
  },
  {
    icon: MessageCircle,
    title: "Instant messaging",
    desc: "Chat alongside video — send notes, corrections, or translations.",
  },
  {
    icon: Zap,
    title: "Smart matching",
    desc: "Get paired with partners who speak your target language.",
  },
  {
    icon: Users,
    title: "Global community",
    desc: "Connect with learners and native speakers from 50+ countries.",
  },
];

const stats = [
  { value: "12K+", label: "Active learners" },
  { value: "50+", label: "Languages" },
  { value: "98%", label: "Satisfaction rate" },
];

const Index = () => {
  const navigate = useNavigate();

  // ✅ If already logged in, skip landing and go to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Nav */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-foreground">Chat-A-Lingo</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button
            size="sm"
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
            onClick={() => navigate("/signup")}
          >
            Get started
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground mb-6">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            Trusted by 12,000+ language learners
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground leading-tight mb-4">
            Learn any language with{" "}
            <span className="text-primary">real conversations</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Practice speaking with native speakers worldwide through live video and chat. No textbooks. Just real talk.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gradient-primary border-0 text-primary-foreground hover:opacity-90 h-12 px-8"
              onClick={() => navigate("/signup")}
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-10 mt-16"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-card/50 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground text-center mb-10">
            Everything you need to become fluent
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <h2 className="text-2xl font-display font-bold text-foreground mb-3">
            Ready to start speaking?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of learners having real conversations today.
          </p>
          <Button
            size="lg"
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90 h-12 px-10"
            onClick={() => navigate("/signup")}
          >
            Create free account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Chat-A-Lingo. All rights reserved.
      </footer>

    </div>
  );
};

export default Index;