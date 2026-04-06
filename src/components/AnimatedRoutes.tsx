import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/pages/AuthCallback";

// Public pages
const Landing        = lazy(() => import("@/pages/Landing"));
const Login          = lazy(() => import("@/pages/Login"));
const Signup         = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword  = lazy(() => import("@/pages/ResetPassword"));
const AdminLogin     = lazy(() => import("@/pages/AdminLogin"));
const Install        = lazy(() => import("@/pages/Install"));
const NotFound       = lazy(() => import("@/pages/NotFound"));

// ✅ All protected pages go through Dashboard which handles layout + routing
const Dashboard = lazy(() => import("@/pages/Dashboard"));

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};
const pageTransition = { duration: 0.2 };

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

          {/* ── Public routes ── */}
          <Route path="/"                element={<AnimatedPage><Landing /></AnimatedPage>} />
          <Route path="/login"           element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/signup"          element={<AnimatedPage><Signup /></AnimatedPage>} />
          <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
          <Route path="/reset-password"  element={<AnimatedPage><ResetPassword /></AnimatedPage>} />
          <Route path="/auth/callback"   element={<AnimatedPage><AuthCallback /></AnimatedPage>} />
          <Route path="/sudo-panel"      element={<AnimatedPage><AdminLogin /></AnimatedPage>} />
          <Route path="/install"         element={<AnimatedPage><Install /></AnimatedPage>} />

          {/* ── Protected routes ── */}
          {/* ALL go through Dashboard which handles layout + content based on path */}
          <Route element={<ProtectedRoute />}>

            {/* Role dashboards */}
            <Route path="/dashboard"            element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/restaurant-dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/ngo-dashboard"        element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/volunteer-dashboard"  element={<AnimatedPage><Dashboard /></AnimatedPage>} />

            {/* ✅ All sidebar pages — Dashboard handles layout */}
            <Route path="/profile"      element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/analytics"    element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/chat"         element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/call-history" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/map"          element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/leaderboard"  element={<AnimatedPage><Dashboard /></AnimatedPage>} />

            {/* ✅ Admin routes — Dashboard checks role and renders correct page */}
            <Route path="/admin"               element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/dashboard"     element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/users"         element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/analytics"     element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/food-listings" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/volunteers"    element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/admin/settings"      element={<AnimatedPage><Dashboard /></AnimatedPage>} />
          </Route>

          <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

export default AnimatedRoutes;