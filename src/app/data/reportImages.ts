import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";

export const REPORT_CARD_IMAGES_BUCKET = "report-card-images";

function sanitizeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

export async function uploadReportCardImage(file: File, userId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("O Supabase não está configurado neste ambiente.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }

  const path = `${userId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(REPORT_CARD_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("[SupabaseStorage] Falha ao enviar imagem do card", {
      errorMessage: error.message,
      bucket: REPORT_CARD_IMAGES_BUCKET,
      path,
      ...getSupabaseDiagnostics(),
    });
    throw error;
  }

  const { data } = supabase.storage.from(REPORT_CARD_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
