import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .url("유효한 URL을 입력해 주세요.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "https URL만 사용할 수 있습니다.");

export const eventInputSchema = z.object({
  publicTitle: z.string().trim().min(1).max(80),
  generationLabel: z.string().trim().min(1).max(40),
  eventDate: z.string().trim().min(1).max(40),
  region: z.string().trim().min(1).max(40),
  venueNote: z.string().trim().min(1).max(120),
  capacityNote: z.string().trim().min(1).max(60),
  applicationConditions: z.string().trim().min(1).max(120),
  status: z.enum(["open", "closing-soon", "closed", "scheduled", "hidden"]),
  googleFormUrl: httpsUrl
});

export function listEvents(db) {
  return db.prepare("select * from events order by is_featured desc, created_at desc").all();
}

function mapEventForAdmin(event) {
  if (!event) return null;

  return {
    id: event.id,
    publicTitle: event.public_title,
    generationLabel: event.generation_label,
    eventDate: event.event_date,
    region: event.region,
    venueNote: event.venue_note,
    capacityNote: event.capacity_note,
    applicationConditions: event.application_conditions,
    status: event.status,
    googleFormUrl: event.google_form_url,
    isFeatured: Boolean(event.is_featured),
    isVisible: Boolean(event.is_visible)
  };
}

export function getFeaturedEventForAdmin(db) {
  const event = db.prepare("select * from events where is_featured = 1 limit 1").get();
  return mapEventForAdmin(event);
}

export function getEventForAdmin(db, id) {
  return db.prepare("select * from events where id = ?").get(id) || null;
}

export function updateEvent(db, id, input) {
  const data = eventInputSchema.parse(input);
  const result = db.prepare(`
    update events set
      public_title = ?,
      generation_label = ?,
      event_date = ?,
      region = ?,
      venue_note = ?,
      capacity_note = ?,
      application_conditions = ?,
      status = ?,
      google_form_url = ?,
      updated_at = datetime('now')
    where id = ?
  `).run(
    data.publicTitle,
    data.generationLabel,
    data.eventDate,
    data.region,
    data.venueNote,
    data.capacityNote,
    data.applicationConditions,
    data.status,
    data.googleFormUrl,
    id
  );

  return result.changes === 1;
}
