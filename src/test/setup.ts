import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// El default de Testing Library para findBy*/waitFor es 1000 ms, y ese número no mide si el
// componente está bien: mide cuánta CPU había libre. Con los 76 archivos corriendo en paralelo,
// 4 o 5 tests AL AZAR se pasaban del segundo y fallaban con "Unable to find role=...".
//
// Cómo se diagnosticó, por si vuelve: el conjunto que fallaba cambiaba en cada corrida sobre el
// MISMO commit, cada archivo pasaba solo, y `vitest run --no-file-parallelism` daba 425/425.
// Eso descarta bug de producto y descarta fuga de estado entre archivos — los 42 tests que usan
// vi.stubGlobal ya limpian con unstubAllGlobals.
//
// 5 s no tapa nada: un componente que de verdad no renderiza tampoco renderiza en 5 s. Lo que
// deja de hacer es fallar por estar la máquina ocupada.
//
// ── 2026-08-04: subido a 10 s. Los 5 s se calcularon con 76 archivos / 425 tests; hoy son
// 81 / 485, y S27 sumó archivos caros (CreditCardStatement son 22 tests con selects async y
// consultas de cotización). Volvió a fallar UN test al azar por corrida —`TransactionsPageRowUi`
// y una vez `DashboardPage`— con el mismo perfil de siempre.
//
// Re-diagnosticado con el procedimiento de acá arriba, que por eso quedó escrito: mismo commit,
// cada archivo pasa solo, y `vitest run --no-file-parallelism` da **485/485**. Es contención de
// CPU, no producto.
//
// Esto es una MITIGACIÓN y se va a volver a quedar corta: el número sube cada vez que la suite
// crece. La cura estructural es bajar la saturación (`maxWorkers` en vitest.config.ts) en vez de
// seguir estirando el reloj, pero eso se paga en wall-clock de CADA corrida — serial son 378 s
// contra ~50. Cuando el próximo sprint lo rompa, ESE es el trade-off a decidir; no otro +5 s
// automático.
configure({ asyncUtilTimeout: 10000 });

// Sin globals:true, Testing Library no puede registrar su auto-cleanup
afterEach(() => {
  cleanup();
});
