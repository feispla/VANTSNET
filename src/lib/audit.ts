// Registro de auditoría para mutaciones importantes (quién, qué, cuándo).
import { db } from '@/lib/db';

export interface AuditEntry {
  actor: string;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: unknown;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.orm.public.AuditLog.create({
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      detailJson: entry.detail === undefined ? null : JSON.stringify(entry.detail),
    });
  } catch (err) {
    // La auditoría no debe romper la operación principal, pero sí debe quedar
    // constancia del fallo en logs del servidor.
    console.error('audit-log-failure', {
      action: entry.action,
      entity: entry.entity,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
