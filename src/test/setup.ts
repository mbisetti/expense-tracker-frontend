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
configure({ asyncUtilTimeout: 5000 });

// Sin globals:true, Testing Library no puede registrar su auto-cleanup
afterEach(() => {
  cleanup();
});
