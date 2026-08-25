// Bot de WhatsApp (S45) — estado del vínculo para la página de Cuenta.

export type WhatsAppLinkStatus = {
  /** false = el canal no está configurado en este entorno y la sección NO se dibuja. */
  configured: boolean;
  linked: boolean;
  /** Código de vinculación pendiente (si hay uno vivo). */
  code: string | null;
  codeExpiresAt: string | null;
  /**
   * `https://wa.me/<numero>?text=<codigo>`: abre el chat con el código ya escrito.
   * Dos taps en vez de copiar y pegar entre dos apps. null si no hay código vivo.
   */
  deepLink: string | null;
  /** El teléfono vinculado, enmascarado. Es dato personal: nunca llega entero. */
  maskedPhone: string | null;
};
