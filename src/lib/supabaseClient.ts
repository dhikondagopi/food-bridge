import { createClient, type RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const BUCKETS = {
  FOOD_IMAGES: "food-images",
  AVATARS: "avatars",
  DOCUMENTS: "documents",
} as const;

export const subscribeToTable = (
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) => {
  const channel = supabase.channel(`public:${table}`);

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
    supabase.removeChannel(channel);
  };
};

export const uploadFoodImage = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split(".").pop() || "jpg";
  const filePath = `food/${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.FOOD_IMAGES)
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(BUCKETS.FOOD_IMAGES)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Failed to generate public URL");
  }

  return data.publicUrl;
};

export const uploadAvatar = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split(".").pop() || "jpg";
  const filePath = `avatars/${userId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.AVATARS)
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(BUCKETS.AVATARS)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Failed to generate public URL");
  }

  return data.publicUrl;
};

export const deleteFile = async (
  bucket: string,
  filePath: string
): Promise<boolean> => {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  return !error;
};