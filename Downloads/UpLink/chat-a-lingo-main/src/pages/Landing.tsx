import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Globe, MessageCircle, Video, Shield, Zap, Users, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "Smart Matching",
    description: "Get paired with native speakers who want to learn your language. Perfect language exchange every time.",
  },
  {
    icon: MessageCircle,
    title: "Real-Time Chat",
    description: "Text messaging with typing indicators, translations, and conversation tools built right in.",
  },
  {
    icon: Video,
    title: "Video Conversations",
    description: "Practice speaking with face-to-face video calls. Build confidence in real conversations.",
  },
  {
    icon: Shield,
    title: "Safe & Moderated",
    description: "Report and block tools keep the community safe. Every conversation is a positive experience.",
  },
  {
    icon: Zap,
    title: "Gamified Learning",
    description: "Earn points, maintain streaks, and track progress. Stay motivated with achievements.",
  },
  {
    icon: Users,
    title: "Global Community",
    description: "Connect with learners from 190+ countries. Practice any language, anytime.",
  },
];

const stats = [
  { value: "2M+", label: "Active Learners" },
  { value: "50+", label: "Languages" },
  { value: "10M+", label: "Conversations" },
  { value: "4.9★", label: "User Rating" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">UpLink</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Community</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
              <Star className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">The #1 Language Exchange Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-foreground mb-6">
              Learn languages by{" "}
              <span className="text-gradient">speaking them</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Connect with native speakers worldwide. Practice real conversations through chat and video.
              The fastest way to fluency starts with a conversation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="gradient-primary border-0 text-primary-foreground hover:opacity-90 px-8 h-12 text-base shadow-glow">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="px-8 h-12 text-base">
                  See How It Works
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-border bg-card p-2 shadow-lg">
              <div className="rounded-xl bg-secondary/50 p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User A */}
                  <div className="rounded-xl bg-card p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">A</div>
                      <div>
                        <p className="font-semibold text-card-foreground text-sm">Priya</p>
                        <p className="text-xs text-muted-foreground">🇮🇳 Telugu → 🇬🇧 English</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-primary/10 text-foreground rounded-xl rounded-tl-sm px-4 py-2 text-sm w-fit">Hello! How are you? 👋</div>
                      <div className="bg-secondary text-foreground rounded-xl rounded-tl-sm px-4 py-2 text-sm w-fit">Can you teach me some slang?</div>
                    </div>
                  </div>
                  {/* User B */}
                  <div className="rounded-xl bg-card p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold text-sm">B</div>
                      <div>
                        <p className="font-semibold text-card-foreground text-sm">James</p>
                        <p className="text-xs text-muted-foreground">🇬🇧 English → 🇮🇳 Telugu</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-accent/10 text-foreground rounded-xl rounded-tl-sm px-4 py-2 text-sm w-fit">నమస్కారం! బాగున్నారా? 🙏</div>
                      <div className="bg-secondary text-foreground rounded-xl rounded-tl-sm px-4 py-2 text-sm w-fit">Of course! Let's trade!</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-display font-bold text-gradient">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything you need to become fluent
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              UpLink combines smart matching, real-time communication, and gamification to make language learning fun and effective.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Start speaking in 3 steps
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Set your languages", desc: "Tell us your native language and what you want to learn." },
              { step: "02", title: "Get matched", desc: "Our algorithm finds the perfect language partner for you." },
              { step: "03", title: "Start talking", desc: "Chat via text or video and practice real conversations." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-display font-bold text-gradient mb-4">{item.step}</div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl gradient-hero p-12 md:p-20 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
                Ready to start speaking?
              </h2>
              <p className="text-primary-foreground/70 max-w-lg mx-auto mb-8">
                Join millions of learners having real conversations every day. It's free to start.
              </p>
              <Link to="/signup">
                <Button size="lg" className="gradient-primary border-0 text-primary-foreground hover:opacity-90 px-10 h-12 text-base shadow-glow">
                  Join UpLink — It's Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
                <Globe className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">UpLink</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 UpLink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
