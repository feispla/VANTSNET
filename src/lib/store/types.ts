// Tipos compartidos del almacén de identidad (espejo del contrato Prisma).
// El contrato PG usa TimestamptzString; en D1 (SQLite) las fechas viven como
// texto ISO-8601 UTC — mismas formas, distinto transporte.

export type Usuario = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type Identidad = {
  id: string;
  userId: string;
  provider: 'discord' | 'faceit' | 'riot' | 'steam';
  providerId: string;
  displayName: string | null;
  avatarUrl: string | null;
  rawJson: string | null;
  lastSyncAt: string | null;
  createdAt: string;
};

export type UsuarioConIdentidades = Usuario & {
  identidades: Array<Pick<Identidad, 'provider' | 'providerId' | 'displayName' | 'avatarUrl'>>;
};
