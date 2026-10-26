// Publicación de eventos hacia VANTS-BUS con identidad "vantsnet".
// Apagada por completo si faltan VANTS_BUS_URL o VANTS_BUS_SECRET:
// sin configuración no hay red y el resto de la API funciona igual.
// Un fallo de publicación se registra y devuelve false; NUNCA rompe
// el endpoint que originó el evento (el evento comunica algo que ya pasó).
import { VantsBus, type BusEventType } from './vants-bus';

// Re-export para que los consumidores importen todo desde un solo sitio.
export { EVENTS, type BusEventType } from './vants-bus';

const PROJECT_ID = 'vantsnet';

let cliente: VantsBus | null = null;
let configUrl = '';
let configSecret = '';

function busCliente(): VantsBus | null {
  const url = process.env.VANTS_BUS_URL;
  const secret = process.env.VANTS_BUS_SECRET;
  if (!url || !secret) return null;
  if (!cliente || configUrl !== url || configSecret !== secret) {
    cliente = new VantsBus({ busUrl: url, projectId: PROJECT_ID, secret });
    configUrl = url;
    configSecret = secret;
  }
  return cliente;
}

// Fire-and-forget: el emisor usa `void publishBusEvent(...)` para no
// ralentizar la respuesta. Devuelve true si el bus aceptó el evento.
export async function publishBusEvent(
  type: BusEventType,
  data: Record<string, unknown>
): Promise<boolean> {
  const cli = busCliente();
  if (!cli) return false;
  try {
    await cli.publish(type, data);
    return true;
  } catch (err) {
    console.error(
      'bus-publish',
      type,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
