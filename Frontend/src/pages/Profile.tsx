import { useState } from "react";

const Profile = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent/10 flex items-center justify-center">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center space-y-6">
        <h2 className="text-2xl font-bold text-primary">Your Profile</h2>

        <div className="flex flex-col items-center gap-4">
          <div className="h-28 w-28 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm">No photo</span>
            )}
          </div>

          <label className="text-sm font-medium text-foreground">
            Upload profile picture
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Profile;
