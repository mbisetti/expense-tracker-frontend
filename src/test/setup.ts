import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Sin globals:true, Testing Library no puede registrar su auto-cleanup
afterEach(() => {
  cleanup();
});
