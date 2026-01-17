import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type ThemePreference = "light" | "dark";

const Settings = () => {
  const { userId, userEmail } = useAuth();
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedTheme = localStorage.getItem("nexasense_theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const loadSettings = async () => {
      try {
        const profileRef = doc(db, "users", userId, "profile", "info");
        const profileSnapshot = await getDoc(profileRef);
        if (profileSnapshot.exists()) {
          const data = profileSnapshot.data() as {
            displayName?: string;
            themePreference?: ThemePreference;
            emailNotifications?: boolean;
            pushNotifications?: boolean;
          };
          if (data.displayName) {
            setDisplayName(data.displayName);
          }
          if (data.themePreference) {
            setTheme(data.themePreference);
          }
          setEmailNotifications(Boolean(data.emailNotifications));
          setPushNotifications(Boolean(data.pushNotifications));
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };
    loadSettings();
  }, [userId]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("nexasense_theme", theme);
  }, [theme]);

  const handleSave = async () => {
    if (!userId) {
      return;
    }
    setIsSaving(true);
    setStatusMessage("");
    try {
      const profileRef = doc(db, "users", userId, "profile", "info");
      await setDoc(
        profileRef,
        {
          themePreference: theme,
          emailNotifications,
          pushNotifications,
        },
        { merge: true }
      );
      setStatusMessage("Settings saved.");
    } catch (error) {
      console.error("Failed to save settings", error);
      setStatusMessage("Unable to save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your preferences and account details.
          </p>
        </header>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Appearance & Notifications
          </h2>
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Theme preference
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose light or dark mode.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Light</span>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                />
                <span className="text-xs text-muted-foreground">Dark</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Email notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Get updates on new summaries and progress insights.
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Push notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Stay alerted to streaks and rewards.
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
            {statusMessage && (
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Account information
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Display name
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {displayName || "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs uppercase text-muted-foreground">Email</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {userEmail || "Not available"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
