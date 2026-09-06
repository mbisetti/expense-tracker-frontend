// S47 "Seshat" — grupos de gastos compartidos.
//
// Lo que hay que tener en la cabeza leyendo esto: el grupo NO es un cuaderno aparte. Cada gasto
// que se carga acá cae en el ledger de cada miembro con su cuenta y su categoría, así que cuenta
// en el mes, en el presupuesto y en los informes de cada uno. Por eso entrar a un grupo se
// pre-confirma eligiendo de qué cuenta sale tu plata.
//
// Y lo que el grupo NO comparte, que es una promesa de producto: tu cuenta, tu método de pago, tu
// categoría y tu saldo son tuyos. El resto del grupo ve nombres y montos del gasto, nada más.

/** Saldo en UNA moneda. Positivo = te deben, negativo = debés. Nunca se consolidan monedas. */
export type GroupBalanceAmount = {
  currency: string;
  net: number;
};

export type GroupMember = {
  id: string;
  displayName: string;
  /** Ya tiene cuenta en la app. False = todavía es sólo un nombre y se puede reclamar. */
  claimed: boolean;
  owner: boolean;
  me: boolean;
  /** Se fue del grupo. Sigue apareciendo porque sus gastos viejos siguen contando. */
  left: boolean;
};

export type GroupSummary = {
  id: string;
  name: string;
  currency: string;
  simplifyDebts: boolean;
  owner: boolean;
  memberCount: number;
  myBalance: GroupBalanceAmount[];
};

export type GroupDetail = {
  id: string;
  name: string;
  currency: string;
  simplifyDebts: boolean;
  owner: boolean;
  members: GroupMember[];
  myMemberId: string;
  /** Mi configuración, y sólo la mía: la de los demás no viaja en esta respuesta. */
  myAccountId: string | null;
  myPaymentMethodId: string | null;
  myCategoryId: string | null;
  myBalance: GroupBalanceAmount[];
};

export type GroupInvite = {
  /** El token en claro existe una sola vez, acá. En la base sólo queda su sha256. */
  url: string;
  expiresAt: string;
};

export type ClaimableMember = {
  id: string;
  displayName: string;
};

export type JoinPreview = {
  groupName: string;
  memberCount: number;
  expenseCount: number;
  /** Las etiquetas libres: el "¿alguno de estos sos vos?" de la pantalla de entrada. */
  claimable: ClaimableMember[];
  alreadyMember: boolean;
};

export type CreateGroupInput = {
  name: string;
  currency?: string;
};

export type UpdateGroupInput = {
  name?: string;
  currency?: string;
  simplifyDebts?: boolean;
};

export type MembershipInput = {
  accountId: string;
  paymentMethodId?: string | null;
  categoryId?: string | null;
};

export type JoinGroupInput = MembershipInput & {
  token: string;
  /** Reclamar una etiqueta que ya existía en el grupo. Sin esto, entrás como miembro nuevo. */
  claimMemberId?: string | null;
};
