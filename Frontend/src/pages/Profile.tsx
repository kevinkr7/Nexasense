import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { signOut, updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { userId, userDisplayName, userEmail, userPhotoURL } = useAuth();
  const [displayName, setDisplayName] = useState(userDisplayName || "");
  const [bio, setBio] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    userPhotoURL || null
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notesUploaded, setNotesUploaded] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() ?? null;
      setPhotoPreview(result);
      setPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setDisplayName(userDisplayName || "");
    setPhotoPreview(userPhotoURL || null);
  }, [userDisplayName, userPhotoURL]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadProfile = async () => {
      const profileRef = doc(db, "users", userId, "profile", "info");
      const statsRef = doc(db, "users", userId, "progress", "stats");

      const [profileSnapshot, statsSnapshot, notesCountSnapshot] =
        await Promise.all([
          getDoc(profileRef),
          getDoc(statsRef),
          getCountFromServer(collection(db, "users", userId, "notes")),
        ]);

      if (profileSnapshot.exists()) {
        const data = profileSnapshot.data();
        setDisplayName(
          (data.displayName as string | undefined) || userDisplayName || ""
        );
        setBio((data.bio as string | undefined) || "");
        if (data.photoURL) {
          setPhotoPreview(data.photoURL as string);
        }
      } else {
        await setDoc(
          profileRef,
          {
            displayName: userDisplayName || "",
            email: userEmail || "",
            bio: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (statsSnapshot.exists()) {
        const statsData = statsSnapshot.data();
        setTotalSummaries(Number(statsData.totalSummaries || 0));
        const lastActivityTimestamp = statsData.lastActivity?.toDate?.();
        setLastActivity(lastActivityTimestamp || null);
      }

      setNotesUploaded(notesCountSnapshot.data().count);
    };

    loadProfile();
  }, [userId, userDisplayName, userEmail]);

  const accountCreatedLabel = useMemo(() => {
    const createdAt = auth.currentUser?.metadata.creationTime;
    if (!createdAt) {
      return "Not available";
    }
    return new Date(createdAt).toLocaleDateString();
  }, [userId]);

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
          displayName,
          bio,
          photoURL: photoPreview,
          email: userEmail || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (auth.currentUser) {
        const updates: { displayName?: string; photoURL?: string } = {};
        if (displayName) {
          updates.displayName = displayName;
        }
        if (photoDataUrl) {
          updates.photoURL = photoDataUrl;
        }
        if (Object.keys(updates).length > 0) {
          await updateProfile(auth.currentUser, updates);
        }
      }

      setStatusMessage("Profile saved.");
      setPhotoDataUrl(null);
    } catch (error) {
      console.error("Failed to save profile", error);
      setStatusMessage("We couldn't save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Review your identity, update personal details, and track your
            learning momentum.
          </p>
        </header>

        <section className="grid gap-6 rounded-2xl border border-border/60 bg-card p-6 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-start gap-4">
            <div className="h-32 w-32 overflow-hidden rounded-full border border-border bg-muted">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {displayName || "NexaSense Learner"}
              </h2>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Account created: {accountCreatedLabel}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Profile overview
              </h3>
              <p className="text-sm text-muted-foreground">
                Keep your information accurate so your study space stays
                personalized.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Notes uploaded
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {notesUploaded}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Total summaries
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {totalSummaries}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:col-span-2">
                <p className="text-xs uppercase text-muted-foreground">
                  Last activity
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {lastActivity
                    ? lastActivity.toLocaleString()
                    : "No activity recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">
              Editable information
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update how your name appears across NexaSense and add a short bio.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Add a display name"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Bio / About
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="mt-2 min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Share a short academic focus or goal."
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              {statusMessage && (
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">
              Account actions
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your profile picture and session securely.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Change profile picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await signOut(auth);
                  localStorage.removeItem("nexasense_token");
                  navigate("/");
                }}
              >
                Logout
              </Button>
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                Delete account (coming soon)
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
