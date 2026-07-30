// Bot de Telegram (S30) — estado del vínculo para Ajustes.

export type TelegramLinkStatus = {
  linked: boolean;
  /** null = el bot no está configurado en este entorno → la sección no se muestra. */
  botUsername: string | null;
  /** Código de vinculación pendiente (si hay uno vivo). */
  code: string | null;
  codeExpiresAt: string | null;
};
