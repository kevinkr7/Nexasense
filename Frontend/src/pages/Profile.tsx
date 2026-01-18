import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// 1. Removed Storage imports
import { auth, db } from "@/firebase"; 
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";

type CropPosition = {
  x: number;
  y: number;
};

type ProfileSnapshot = {
  displayName: string;
  bio: string;
  photoURL: string;
};

const CROP_SIZE = 240;
const OUTPUT_SIZE = 320;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const createCroppedImage = async (
  imageSrc: string,
  crop: CropPosition,
  zoom: number,
): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get canvas context");
  }

  const displayWidth = image.width * zoom;
  const displayHeight = image.height * zoom;
  const imageLeft = CROP_SIZE / 2 + crop.x - displayWidth / 2;
  const imageTop = CROP_SIZE / 2 + crop.y - displayHeight / 2;

  const sourceX = (0 - imageLeft) / zoom;
  const sourceY = (0 - imageTop) / zoom;
  const sourceSize = CROP_SIZE / zoom;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  // Compress quality slightly to ensure it fits easily in Firestore (0.8 = 80% quality)
  return canvas.toDataURL("image/jpeg", 0.8);
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, userId, userDisplayName, userEmail, userPhotoURL } = useAuth();
  
  const [initialProfile, setInitialProfile] = useState<ProfileSnapshot>({
    displayName: userDisplayName || "",
    bio: "",
    photoURL: userPhotoURL || "",
  });
  
  const [draftDisplayName, setDraftDisplayName] = useState(userDisplayName || "");
  const [draftBio, setDraftBio] = useState("");
  const [draftPhotoURL, setDraftPhotoURL] = useState(userPhotoURL || "");
  const [notesUploaded, setNotesUploaded] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropPosition, setCropPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  
  const dragState = useRef<{ startX: number; startY: number } | null>(null);
  const hasPushedState = useRef(false);

  // Priority: Draft -> Firestore Data -> Auth Data
  const avatarSrc = draftPhotoURL || initialProfile.photoURL || userPhotoURL || "";

  const isDirty = useMemo(() => {
    return (
      draftDisplayName.trim() !== initialProfile.displayName.trim() ||
      draftBio.trim() !== initialProfile.bio.trim() ||
      (draftPhotoURL || "") !== (initialProfile.photoURL || "")
    );
  }, [draftBio, draftDisplayName, draftPhotoURL, initialProfile]);

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (isDirty && !hasPushedState.current) {
      window.history.pushState({ profileGuard: true }, "", window.location.href);
      hasPushedState.current = true;
    }
    if (!isDirty) hasPushedState.current = false;
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (!isDirty) return;
      if (window.confirm("You have unsaved changes. Do you want to leave this page?")) {
        hasPushedState.current = false;
      } else {
        window.history.pushState({ profileGuard: true }, "", window.location.href);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  // Load Profile Data
  useEffect(() => {
    if (!userId) return;

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
        const snapshot: ProfileSnapshot = {
          displayName: (data.displayName as string) || userDisplayName || "",
          bio: (data.bio as string) || "",
          // CRITICAL: Read photoURL from Firestore first
          photoURL: (data.photoURL as string) || userPhotoURL || "",
        };
        setInitialProfile(snapshot);
        setDraftDisplayName(snapshot.displayName);
        setDraftBio(snapshot.bio);
        setDraftPhotoURL(snapshot.photoURL);
      } else {
        // Initialize if not exists
        const snapshot: ProfileSnapshot = {
          displayName: userDisplayName || "",
          bio: "",
          photoURL: userPhotoURL || "",
        };
        await setDoc(profileRef, {
            displayName: snapshot.displayName,
            email: userEmail || "",
            bio: snapshot.bio,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });
        
        setInitialProfile(snapshot);
        setDraftDisplayName(snapshot.displayName);
        setDraftBio(snapshot.bio);
        setDraftPhotoURL(snapshot.photoURL);
      }

      if (statsSnapshot.exists()) {
        const statsData = statsSnapshot.data();
        setTotalSummaries(Number(statsData.totalSummaries || 0));
        setLastActivity(statsData.lastActivity?.toDate?.() || null);
      }
      setNotesUploaded(notesCountSnapshot.data().count);
    };

    loadProfile();
  }, [userId, userDisplayName, userEmail, userPhotoURL]);

  const accountCreatedLabel = useMemo(() => {
    return user?.metadata.creationTime 
      ? new Date(user.metadata.creationTime).toLocaleDateString() 
      : "Not available";
  }, [user]);

  // Image & Cropping Logic
  useEffect(() => {
    if (!selectedImage) {
      setImageSize(null);
      return;
    }
    const image = new Image();
    image.src = selectedImage;
    image.onload = () => setImageSize({ width: image.width, height: image.height });
  }, [selectedImage]);

  const clampCropPosition = useCallback(
    (nextCrop: CropPosition, zoomLevel: number) => {
      if (!imageSize) return nextCrop;
      const displayWidth = imageSize.width * zoomLevel;
      const displayHeight = imageSize.height * zoomLevel;
      const maxOffsetX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
      const maxOffsetY = Math.max(0, (displayHeight - CROP_SIZE) / 2);
      return {
        x: clamp(nextCrop.x, -maxOffsetX, maxOffsetX),
        y: clamp(nextCrop.y, -maxOffsetY, maxOffsetY),
      };
    },
    [imageSize],
  );

  useEffect(() => {
    if (!imageSize) return;
    setCropPosition((current) => clampCropPosition(current, zoom));
  }, [clampCropPosition, imageSize, zoom]);

  useEffect(() => {
    if (!selectedImage) {
      setCroppedPreview(null);
      return;
    }
    const generatePreview = async () => {
      try {
        const preview = await createCroppedImage(selectedImage, cropPosition, zoom);
        setCroppedPreview(preview);
      } catch (error) {
        console.error("Failed to generate preview", error);
      }
    };
    generatePreview();
  }, [cropPosition, selectedImage, zoom]);

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() ?? null;
      if (result) {
        setSelectedImage(result);
        setZoom(1);
        setCropPosition({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;
    dragState.current = { startX: event.clientX, startY: event.clientY };
    setCropPosition((current) =>
      clampCropPosition({ x: current.x + deltaX, y: current.y + deltaY }, zoom),
    );
  };

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSaveAvatar = () => {
    if (!croppedPreview) return;
    setDraftPhotoURL(croppedPreview);
    setIsAvatarModalOpen(false);
    setSelectedImage(null);
    setZoom(1);
    setCropPosition({ x: 0, y: 0 });
  };

  const handleCloseAvatarModal = () => {
    setIsAvatarModalOpen(false);
    setSelectedImage(null);
    setZoom(1);
    setCropPosition({ x: 0, y: 0 });
  };

  // MAIN SAVE LOGIC (Database Only)
  const handleSaveProfile = async () => {
    if (!userId || !isDirty) return;
    setIsSaving(true);
    setStatusMessage("");

    try {
      // 1. Save all data (including Base64 photo) to Firestore
      const profileRef = doc(db, "users", userId, "profile", "info");
      await setDoc(
        profileRef,
        {
          displayName: draftDisplayName,
          bio: draftBio,
          // We save the long Base64 string directly here
          photoURL: draftPhotoURL || "", 
          email: userEmail || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // 2. Update Firebase Auth (Display Name ONLY)
      // We DO NOT update photoURL in Auth because Base64 is too long for Auth
      if (user && draftDisplayName !== initialProfile.displayName) {
        await updateProfile(user, { displayName: draftDisplayName });
      }

      setInitialProfile({
        displayName: draftDisplayName,
        bio: draftBio,
        photoURL: draftPhotoURL || "",
      });
      
      setStatusMessage("Changes saved to database successfully.");
    } catch (error) {
      console.error("Failed to save profile", error);
      setStatusMessage("Failed to save changes. Please try again.");
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

        <section className="grid gap-6 rounded-2xl border border-border/60 bg-card p-6 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-start gap-4">
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="group relative h-32 w-32 overflow-hidden rounded-full border border-border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Edit profile photo"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
                Edit photo
              </div>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {draftDisplayName || "NexaSense Learner"}
              </h2>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Account created: {accountCreatedLabel}
              </p>
            </div>
          </div>
          {/* Stats Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Identity overview</h3>
              <p className="text-sm text-muted-foreground">
                This is how your academic identity appears across NexaSense.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Notes uploaded</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{notesUploaded}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Total summaries</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{totalSummaries}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:col-span-2">
                <p className="text-xs uppercase text-muted-foreground">Last activity</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {lastActivity ? lastActivity.toLocaleString() : "No activity recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Editable Fields */}
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Editable profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update how your name appears across NexaSense and add a short bio.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Display name
                <input
                  type="text"
                  value={draftDisplayName}
                  onChange={(event) => setDraftDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Add a display name"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Bio / About
                <textarea
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                  className="mt-2 min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Share a short academic focus or goal."
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button type="button" onClick={handleSaveProfile} disabled={!isDirty || isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              {statusMessage && (
                <p className="text-sm text-muted-foreground" role="status">{statusMessage}</p>
              )}
              {!isDirty && !isSaving && (
                <p className="text-sm text-muted-foreground">Your profile is up to date.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border/60 bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground">Account &amp; security</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your active session and account status.
              </p>
              <div className="mt-6 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await signOut(auth);
                    navigate("/");
                  }}
                >
                  Logout
                </Button>
              </div>
            </section>
          </div>
        </section>
      </div>

      {/* Avatar Modal */}
      <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit profile photo</DialogTitle>
            <DialogDescription>
              Upload an image, crop it to a square, and save your updated avatar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <div
                className="relative mx-auto h-[240px] w-[240px] overflow-hidden rounded-2xl border border-border bg-muted"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerLeave={handleCropPointerUp}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Crop"
                    className="absolute left-1/2 top-1/2 h-auto w-auto max-w-none select-none"
                    style={{
                      transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px)) scale(${zoom})`,
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Upload an image to begin
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                  />
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={2.5}
                    step={0.05}
                    onValueChange={(value) => setZoom(value[0])}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Preview</p>
                <div className="mt-4 flex items-center justify-center">
                  <div className="h-32 w-32 overflow-hidden rounded-full border border-border bg-muted">
                    {croppedPreview ? (
                      <img src={croppedPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No preview</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseAvatarModal}>Cancel</Button>
            <Button type="button" onClick={handleSaveAvatar} disabled={!croppedPreview}>Save photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;