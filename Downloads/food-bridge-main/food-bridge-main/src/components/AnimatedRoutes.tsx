import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
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
const Admin = lazy(() => import("@/pages/Admin"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Install = lazy(() => import("@/pages/Install"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Animation
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1],
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="min-h-screen relative"
      >
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <Routes location={location}>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Main */}
            <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
            <Route path="/volunteer-dashboard" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/call-history" element={<CallHistory />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/install" element={<Install />} />

            {/* Admin */}
            <Route path="/sudo-panel" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;