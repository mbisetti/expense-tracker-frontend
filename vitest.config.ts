import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',

    // Los 76 archivos corren en paralelo y en una máquina cargada 4 o 5 tests AL AZAR se
    // pasaban del límite y fallaban con "Unable to find role=...". No eran bugs: el conjunto
    // cambiaba en cada corrida sobre el MISMO commit, cada archivo pasaba solo, y
    // `vitest run --no-file-parallelism` daba 425/425.
    //
    // El asyncUtilTimeout de Testing Library está en 5 s (src/test/setup.ts), así que el tope
    // del test tiene que ser MAYOR: con los dos en 5 s, un findBy lento se come el presupuesto
    // entero y el test muere por timeout sin llegar a decir qué no encontró.
    //
    // Esto no tapa nada. Un componente que no renderiza tampoco renderiza en 20 s; lo que deja
    // de pasar es que la compuerta de CI se ponga roja porque el runner estaba ocupado.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
