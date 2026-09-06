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

// ── El gasto de grupo (bloque B) ────────────────────────────────────────────────────────────

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES';

export type MemberAmount = {
  memberId: string;
  displayName: string;
  amount: number;
};

export type GroupExpense = {
  id: string;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  categoryHint: string | null;
  splitType: SplitType;
  createdByName: string;
  payers: MemberAmount[];
  splits: MemberAmount[];
  /** Lo tuyo, calculado por el server para quien pregunta. */
  yourShare: number;
  yourPaid: number;
  /** Quedaron sin fila en su ledger porque todavía no eligieron cuenta. El gasto entró igual. */
  membersWithoutAccount: string[];
};

export type CreateGroupExpenseInput = {
  amount: number;
  currency?: string;
  date?: string;
  description?: string | null;
  categoryHint?: string | null;
  splitType: SplitType;
  /** Quién puso la plata. La suma tiene que ser el total. */
  payers: { memberId: string; amount: number }[];
  /**
   * Quiénes participan. `value` se lee según el splitType: el monto en EXACT, el porcentaje en
   * PERCENT, las partes en SHARES, y se ignora en EQUAL.
   *
   * El que no está en esta lista NO participa del gasto, y en su ledger no se escribe nada.
   */
  participants: { memberId: string; value?: number }[];
};
