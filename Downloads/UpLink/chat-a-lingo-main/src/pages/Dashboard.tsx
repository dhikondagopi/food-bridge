import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Globe,
  MessageCircle,
  Flame,
  Trophy,
  Clock,
  ArrowRight,
  Settings,
  LogOut,
  Video,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const recentConversations = [
  { name: "James", flag: "🇬🇧", language: "English", duration: "23 min", date: "Today" },
  { name: "Sakura", flag: "🇯🇵", language: "Japanese", duration: "15 min", date: "Yesterday" },
  { name: "Carlos", flag: "🇪🇸", language: "Spanish", duration: "31 min", date: "2 days ago" },
];

interface UserData {
  name: string;
  email: string;
  userId: string;
}

const Dashboard = () => {
  const navigate = useNavigate();

  // ✅ FIXED — load real user data from localStorage
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // ✅ Read user info saved at login/signup
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Corrupted data — clear and re-login
        localStorage.clear();
        navigate("/login");
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ✅ Derive initials for avatar from real name
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border bg-card hidden lg:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">UpLink</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {[
            { icon: TrendingUp, label: "Dashboard", active: true },
            { icon: MessageCircle, label: "Conversations" },
            { icon: Video, label: "Start Session", action: () => navigate("/matching") },
            { icon: Calendar, label: "Schedule" },
            { icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {/* ✅ FIXED — real initials instead of hardcoded "U" */}
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {/* ✅ FIXED — real name from localStorage */}
                {user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "Practice Mode"}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 p-6 md:p-8">
        <div className="lg:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Globe className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">UpLink</span>
          </div>
          <Button
            size="sm"
            className="gradient-primary border-0 text-primary-foreground hover:opacity-90"
            onClick={() => navigate("/matching")}
          >
            New Session
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* ✅ FIXED — personalised greeting */}
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Keep practicing daily to improve fluency.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Flame, label: "Day Streak", value: "7", color: "text-orange-500", bg: "bg-orange-500/10" },
            { icon: Trophy, label: "Total Points", value: "1,240", color: "text-primary", bg: "bg-primary/10" },
            { icon: MessageCircle, label: "Conversations", value: "23", color: "text-accent", bg: "bg-accent/10" },
            { icon: Clock, label: "Practice Time", value: "8.5h", color: "text-blue-500", bg: "bg-blue-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-card-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-display font-semibold mb-4">
            Language Progress
          </h2>

          <div className="space-y-5">
            {[
              { lang: "English", level: "Intermediate", progress: 62 },
              { lang: "Spanish", level: "Beginner", progress: 25 },
            ].map((item) => (
              <div key={item.lang}>
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{item.lang}</p>
                    <p className="text-xs text-muted-foreground">{item.level}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {item.progress}%
                  </span>
                </div>
                <Progress value={item.progress} />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => navigate("/matching")}
          >
            Start New Conversation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;