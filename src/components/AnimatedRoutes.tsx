import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/pages/AuthCallback";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const Profile = lazy(() => import("@/pages/Profile"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Chat = lazy(() => import("@/pages/Chat"));
const CallHistory = lazy(() => import("@/pages/CallHistory"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Install = lazy(() => import("@/pages/Install"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const pageTransition = { duration: 0.25 };

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
  </div>
);

const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/" element={<AnimatedPage><Landing /></AnimatedPage>} />
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
          <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
          <Route path="/reset-password" element={<AnimatedPage><ResetPassword /></AnimatedPage>} />
          <Route path="/auth/callback" element={<AnimatedPage><AuthCallback /></AnimatedPage>} />
          <Route path="/sudo-panel" element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
          <Route path="/install" element={<AnimatedPage><Install /></AnimatedPage>} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Dashboard — routes to correct dashboard based on role */}
            <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/restaurant-dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/ngo-dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/volunteer-dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />

            <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
            <Route path="/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
            <Route path="/chat" element={<AnimatedPage><Chat /></AnimatedPage>} />
            <Route path="/call-history" element={<AnimatedPage><CallHistory /></AnimatedPage>} />
            <Route path="/map" element={<AnimatedPage><MapPage /></AnimatedPage>} />
            <Route path="/leaderboard" element={<AnimatedPage><Leaderboard /></AnimatedPage>} />

            {/* ✅ Admin routes — go through Dashboard so sidebar + DashboardLayout is included */}
            <Route path="/admin" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/users" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
            <Route path="/admin/food-listings" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/volunteers" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/settings" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
          </Route>

          <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

export default AnimatedRoutes;