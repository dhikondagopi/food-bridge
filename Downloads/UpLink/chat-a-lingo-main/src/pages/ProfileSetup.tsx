import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const languages = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Chinese (Mandarin)", "Japanese", "Korean", "Hindi", "Telugu", "Tamil",
  "Arabic", "Russian", "Turkish", "Dutch", "Swedish", "Polish",
];

const levels = ["Beginner", "Intermediate", "Advanced"];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canProceed = nativeLanguage !== "" && learningLanguage !== "" && level !== "";

  const handleContinue = async () => {
    if (!canProceed) return;

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please log in again.");
        return;
      }

      // ✅ FIXED — port 5000 → 5001 via env var
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nativeLanguage,
          learningLanguage,
          skillLevel: level,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Profile update failed");
        return;
      }

      // ✅ Update stored user with language info
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        localStorage.setItem("user", JSON.stringify({
          ...user,
          nativeLanguage,
          learningLanguage,
        }));
      }

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError("Server error. Is the backend running on port 5001?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <Globe className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Set up your profile
          </h1>
          <p className="text-muted-foreground">
            Tell us about your language goals
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
              {error}
            </div>
          )}

          {/* Native Language */}
          <div className="space-y-2">
            <Label>Your native language</Label>
            <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select native language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Learning Language */}
          <div className="space-y-2">
            <Label>Language to learn</Label>
            <Select value={learningLanguage} onValueChange={setLearningLanguage}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select learning language" />
              </SelectTrigger>
              <SelectContent>
                {languages
                  .filter((l) => l !== nativeLanguage)
                  .map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill Level */}
          <div className="space-y-2">
            <Label>Skill level</Label>
            <div className="grid grid-cols-3 gap-3">
              {levels.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`h-11 rounded-lg border text-sm font-medium transition-all ${
                    level === l
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-border/50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!canProceed || loading}
            className="w-full h-12 gradient-primary"
          >
            {loading ? (
              <>Saving... <ChevronRight className="ml-2 h-4 w-4 animate-pulse" /></>
            ) : (
              <>Continue to Dashboard <ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileSetup;