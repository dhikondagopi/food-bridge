import { motion, useScroll, useTransform } from 'framer-motion';
import PrefetchLink from '@/components/PrefetchLink';
import { Button } from '@/components/ui/button';
import { Heart, Utensils, Users, TrendingUp, MapPin, ArrowRight, Leaf, Shield, ChevronDown } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Landing = () => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const { t } = useTranslation();

  const stats = [
    { label: t('landing.mealsSaved'), value: '50,000+', icon: Utensils, accent: 'bg-primary/10 text-primary' },
    { label: t('landing.activeRestaurants'), value: '200+', icon: MapPin, accent: 'bg-success/10 text-success' },
    { label: t('landing.ngoPartners'), value: '80+', icon: Users, accent: 'bg-warning/10 text-warning' },
    { label: t('landing.volunteers'), value: '500+', icon: Heart, accent: 'bg-destructive/10 text-destructive' },
  ];

  const steps = [
    { step: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc'), icon: Utensils },
    { step: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc'), icon: Users },
    { step: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc'), icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 glass"
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <PrefetchLink to="/" className="flex items-center gap-2 group">
            <Leaf className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
            <span className="font-heading text-xl font-bold text-foreground">{t('brand')}</span>
          </PrefetchLink>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">{t('nav.howItWorks')}</a>
            <a href="#impact" className="text-sm text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">{t('nav.impact')}</a>
            <div className="w-28">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <PrefetchLink to="/login">
              <Button variant="ghost" size="sm">{t('nav.logIn')}</Button>
            </PrefetchLink>
            <PrefetchLink to="/signup">
              <Button variant="hero" size="sm">{t('nav.getStarted')}</Button>
            </PrefetchLink>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-24">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <PrefetchLink to="/login"><Button variant="ghost" size="sm">{t('nav.logIn')}</Button></PrefetchLink>
            <PrefetchLink to="/signup"><Button variant="hero" size="sm">{t('nav.join')}</Button></PrefetchLink>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-28 pb-24 px-4 min-h-[90vh] flex items-center">
        <div className="absolute inset-0 gradient-glow pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-success/5 rounded-full blur-3xl pointer-events-none" />
        
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block mb-6 px-5 py-2 rounded-full glass text-sm font-medium text-foreground"
            >
              {t('landing.badge')}
            </motion.span>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[1.1] mb-8 tracking-tight">
              {t('landing.heroTitle1')}{' '}
              <span className="text-gradient">{t('landing.heroTitle2')}</span>
              <br className="hidden sm:block" />
              {t('landing.heroTitle3')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              {t('landing.heroDesc')}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <PrefetchLink to="/signup">
                <Button variant="hero" size="lg" className="text-base px-10 h-14 text-lg shadow-glow hover:shadow-elevated transition-all duration-300">
                  {t('landing.startDonating')} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </PrefetchLink>
              <PrefetchLink to="/signup">
                <Button variant="outline" size="lg" className="text-base px-10 h-14 text-lg hover-lift">
                  {t('landing.joinAsNgo')}
                </Button>
              </PrefetchLink>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="impact" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={item}
                className="bg-card rounded-2xl p-6 shadow-card border border-border hover-lift group cursor-default"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${s.accent} mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="font-heading text-3xl md:text-4xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-accent/30 dark:bg-accent/5" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block mb-3 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">{t('landing.process')}</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">{t('landing.howFoodBridgeWorks')}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t('landing.threeSteps')}</p>
          </motion.div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-6 md:gap-8"
          >
            {steps.map((s) => (
              <motion.div
                key={s.step}
                variants={item}
                className="bg-card rounded-2xl p-8 shadow-card border border-border relative overflow-hidden hover-lift group"
              >
                <span className="text-7xl font-heading font-bold text-primary/5 absolute -top-2 -right-2 transition-transform duration-500 group-hover:scale-110">{s.step}</span>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5 transition-transform duration-300 group-hover:scale-110">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block mb-3 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">{t('landing.features')}</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">{t('landing.builtForImpact')}</h2>
          </motion.div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { icon: MapPin, title: t('landing.smartMaps'), desc: t('landing.smartMapsDesc'), accent: 'bg-primary/10 text-primary' },
              { icon: Shield, title: t('landing.foodSafety'), desc: t('landing.foodSafetyDesc'), accent: 'bg-success/10 text-success' },
              { icon: TrendingUp, title: t('landing.analytics'), desc: t('landing.analyticsDesc'), accent: 'bg-warning/10 text-warning' },
            ].map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="bg-card rounded-2xl p-8 shadow-card border border-border text-center hover-lift group"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${f.accent} mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="gradient-hero rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-5">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-primary-foreground/80 mb-10 text-lg max-w-md mx-auto leading-relaxed">
                {t('landing.ctaDesc')}
              </p>
              <PrefetchLink to="/signup">
                <Button variant="warm" size="lg" className="text-base px-12 h-14 text-lg shadow-elevated hover:scale-105 transition-all duration-300">
                  {t('landing.joinFoodBridge')} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </PrefetchLink>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-4">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-heading font-semibold text-foreground">{t('brand')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
