import { z } from "zod";

// Visit status values
const VisitStatusSchema = z.enum(["pending", "done", "cancelled", "postponed"]);

// Schema for creating/updating a note
export const NoteSchema = z.object({
  content: z.string().min(1, "Le contenu est requis").max(2000, "Maximum 2000 caractères"),
});

// Schema for note ID in delete operations
export const NoteIdSchema = z.object({
  noteId: z.string().min(1, "ID de note requis"),
});

// Schema for creating a photo (FormData validation happens separately)
export const PhotoCaptionSchema = z.object({
  caption: z.string().max(500, "Maximum 500 caractères").optional(),
});

// Schema for photo ID in delete operations
export const PhotoIdSchema = z.object({
  photoId: z.string().min(1, "ID de photo requis"),
});

// Schema for updating visit status
export const UpdateStatusSchema = z.object({
  id: z.string().min(1, "ID de visite requis"),
  status: VisitStatusSchema,
});

// Schema for updating visit material type
export const UpdateMaterialSchema = z.object({
  id: z.string().min(1, "ID de visite requis"),
  materialType: z.string().max(100, "Maximum 100 caractères").nullable(),
});

// Schema for bulk visit order update
export const UpdateOrderSchema = z.object({
  weekId: z.string().min(1, "ID de semaine requis"),
  orderedIds: z.array(z.string().min(1, "ID de visite requis")),
});

// Schema for bulk reorder via PATCH /api/visits { orders: [{ id, sortOrder }] }
export const BulkReorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().min(1, "ID de visite requis"),
      sortOrder: z.number().int("sortOrder doit être un entier"),
    })
  ).min(1, "Au moins une visite est requise"),
});

// Schema for single visit update (PATCH /api/visits)
export const PatchVisitSchema = z.object({
  id: z.string().min(1, "ID de visite requis"),
  status: VisitStatusSchema.optional(),
  materialType: z.string().max(100).nullable().optional(),
  remarks: z.string().max(5000, "Maximum 5000 caractères").nullable().optional(),
  salesRep: z.string().max(200, "Maximum 200 caractères").nullable().optional(),
  visitType: z.string().max(100, "Maximum 100 caractères").optional(),
  materials: z.string().max(2000, "Maximum 2000 caractères").nullable().optional(),
  visitDate: z.string().optional(),
  visitFrequence: z.string().max(100, "Maximum 100 caractères").nullable().optional(),
  merchandiser: z.string().max(200, "Maximum 200 caractères").nullable().optional(),
});

// Schema for glossary term (POST /api/glossary)
export const GlossaryTermSchema = z.object({
  term: z.string().min(1, "Le terme est requis").max(100, "Maximum 100 caractères"),
  definition: z.string().min(1, "La définition est requise").max(500, "Maximum 500 caractères"),
});

// Schema for glossary term ID (DELETE /api/glossary)
export const GlossaryIdSchema = z.object({
  id: z.string().min(1, "ID de terme requis"),
});

// Schema for settings update (POST /api/settings)
export const SettingsSchema = z.object({
  userName: z.string().max(100).optional(),
  userZone: z.string().max(100).optional(),
  userEmail: z.string().email("Email invalide").max(100).optional(),
  homeAddress: z.string().max(200).optional(),
  openaiKey: z.string().max(200).optional(),
});

// Schema for week ID (DELETE /api/weeks)
export const WeekIdSchema = z.object({
  id: z.string().min(1, "ID de semaine requis"),
});

// Schema for applying mail modifications (POST /api/mail/apply)
export const ModificationIdsSchema = z.object({
  modificationIds: z.array(z.string().min(1, "ID requis")).min(1, "Au moins une modification requise"),
});

// Schema for import mode
export const ImportSchema = z.object({
  mode: z.enum(["replace", "merge", "check"]).default("replace"),
});

// Schema for chat messages (POST /api/chat)
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Message vide").max(10000, "Message trop long (max 10 000 caractères)"),
});
export const ChatSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "Au moins un message requis").max(50, "Maximum 50 messages"),
});

// Schema for mail analyze (POST /api/mail/analyze)
export const MailAnalyzeSchema = z.object({
  content: z.string().min(1, "Contenu du mail requis").max(50000, "Mail trop long (max 50 000 caractères)"),
});

// Helper function to validate and return error response if invalid
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues.map((e: { message: string }) => e.message).join(", ");
  return { success: false, error: errorMessage };
}
