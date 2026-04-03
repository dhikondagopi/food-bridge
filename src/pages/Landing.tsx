import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PrefetchLink from '@/components/PrefetchLink';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  Heart,
  Utensils,
  Users,
  TrendingUp,
  MapPin,
  ArrowRight,
  Leaf,
  Shield,
  ChevronDown,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const Landing = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);
  const { t } = useTranslation();

  const stats = [
    {
      label: t('landing.mealsSaved'),
      value: '50,000+',
      icon: Utensils,
      accent: 'bg-blue-600 text-white',
    },
    {
      label: t('landing.activeRestaurants'),
      value: '200+',
      icon: MapPin,
      accent: 'bg-blue-600 text-white',
    },
    {
      label: t('landing.ngoPartners'),
      value: '80+',
      icon: Users,
      accent: 'bg-blue-600 text-white',
    },
    {
      label: t('landing.volunteers'),
      value: '500+',
      icon: Heart,
      accent: 'bg-blue-600 text-white',
    },
  ];

  const steps = [
    {
      step: '01',
      title: t('landing.step1Title'),
      desc: t('landing.step1Desc'),
      icon: Utensils,
    },
    {
      step: '02',
      title: t('landing.step2Title'),
      desc: t('landing.step2Desc'),
      icon: Users,
    },
    {
      step: '03',
      title: t('landing.step3Title'),
      desc: t('landing.step3Desc'),
      icon: Heart,
    },
  ];

  const features = [
    {
      icon: MapPin,
      title: t('landing.smartMaps'),
      desc: t('landing.smartMapsDesc'),
      accent: 'bg-blue-600 text-white',
    },
    {
      icon: Shield,
      title: t('landing.foodSafety'),
      desc: t('landing.foodSafetyDesc'),
      accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      icon: TrendingUp,
      title: t('landing.analytics'),
      desc: t('landing.analyticsDesc'),
      accent: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80"
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <PrefetchLink to="/" className="flex items-center gap-2 group shrink-0">
            <Leaf className="h-7 w-7 text-blue-600 transition-transform duration-300 group-hover:rotate-12" />
            <span className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              {t('brand')}
            </span>
          </PrefetchLink>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              {t('nav.howItWorks')}
            </a>
            <a
              href="#impact"
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              {t('nav.impact')}
            </a>

            <div className="w-32">
              <LanguageSwitcher />
            </div>

            <ThemeToggle />

            <PrefetchLink to="/login">
              <button className="h-11 px-4 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition">
                {t('nav.logIn')}
              </button>
            </PrefetchLink>

            <PrefetchLink to="/signup">
              <button className="h-12 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm">
                {t('nav.join')}
              </button>
            </PrefetchLink>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <PrefetchLink to="/signup">
              <button className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                {t('nav.join')}
              </button>
            </PrefetchLink>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative pt-28 pb-24 px-4 min-h-[92vh] flex items-center"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_45%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_45%)]" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container mx-auto max-w-6xl text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {t('landing.badge')}
            </motion.span>

            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-slate-900 dark:text-white leading-[0.98] mb-8 tracking-tight">
              {t('landing.heroTitle1')}{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {t('landing.heroTitle2')}
              </span>
              <br className="hidden sm:block" />
              {t('landing.heroTitle3')}
            </h1>

            <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              {t('landing.heroDesc')}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <PrefetchLink to="/signup">
                <button className="h-14 px-10 rounded-2xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 inline-flex items-center">
                  {t('landing.startDonating')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </PrefetchLink>

              <PrefetchLink to="/signup">
                <button className="h-14 px-10 rounded-2xl border border-slate-300 bg-white text-slate-900 text-lg font-semibold hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                  {t('landing.joinAsNgo')}
                </button>
              </PrefetchLink>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="impact" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {stats.map((s) => {
              const Icon = s.icon;

              return (
                <motion.div
                  key={s.label}
                  variants={item}
                  className="rounded-2xl p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${s.accent} mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="font-heading text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    {s.value}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {s.label}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block mb-3 px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider dark:bg-blue-500/10 dark:text-blue-300">
              {t('landing.process')}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              {t('landing.howFoodBridgeWorks')}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg max-w-xl mx-auto">
              {t('landing.threeSteps')}
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-6 md:gap-8"
          >
            {steps.map((s) => {
              const Icon = s.icon;

              return (
                <motion.div
                  key={s.step}
                  variants={item}
                  className="rounded-2xl p-8 border border-slate-200 bg-white shadow-sm relative overflow-hidden dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-7xl font-heading font-bold text-blue-100 absolute -top-2 -right-2 dark:text-blue-500/10">
                    {s.step}
                  </span>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 mb-5 dark:bg-blue-500/10 dark:text-blue-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white mb-3">
                    {s.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {s.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block mb-3 px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider dark:bg-blue-500/10 dark:text-blue-300">
              {t('landing.features')}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              {t('landing.builtForImpact')}
            </h2>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {features.map((f) => {
              const Icon = f.icon;

              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="rounded-2xl p-8 border border-slate-200 bg-white shadow-sm text-center dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${f.accent} mb-5`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-12 md:p-16 text-center shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_45%)]" />

            <div className="relative z-10">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-5">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-10 text-lg max-w-2xl mx-auto leading-relaxed">
                {t('landing.ctaDesc')}
              </p>

              <PrefetchLink to="/signup">
                <button className="h-14 px-12 rounded-2xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 inline-flex items-center">
                  {t('landing.joinFoodBridge')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </PrefetchLink>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10 px-4 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-blue-600" />
            <span className="font-heading font-semibold text-slate-900 dark:text-white">
              {t('brand')}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;