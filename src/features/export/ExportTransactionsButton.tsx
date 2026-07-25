import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useExport } from './useExport';
import type { ExportParams } from './api';

type Props = {
  /** Los filtros ACTUALES de la página, ya mapeados al contrato del endpoint. */
  filters: ExportParams;
  /** true si el usuario tiene algún filtro puesto (cuenta/tipo/categoría/fechas/búsqueda). */
  hasFilters: boolean;
};

// Sprint 26 — segunda puerta de entrada al export: el botón de Transacciones. Sin filtros baja
// el dump directo; con filtros pregunta primero, porque "exportar" es ambiguo justo ahí (el
// usuario puede querer todo su historial o exactamente lo que está mirando).
export function ExportTransactionsButton({ filters, hasFilters }: Props) {
  const [askOpen, setAskOpen] = useState(false);
  const { exportFile, isExporting } = useExport();

  const exportAll = () => {
    setAskOpen(false);
    void exportFile('transactions');
  };

  const exportFiltered = () => {
    setAskOpen(false);
    void exportFile('transactions', filters);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={isExporting}
        onClick={() => (hasFilters ? setAskOpen(true) : exportAll())}
      >
        Exportar
      </Button>

      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="¿Qué querés exportar?"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button variant="primary" onClick={exportFiltered}>
              Con los filtros aplicados
            </Button>
            <Button variant="secondary" onClick={exportAll}>
              Todo
            </Button>
            <Button variant="secondary" onClick={() => setAskOpen(false)}>
              Cancelar
            </Button>
          </div>
        }
      >
        <p>
          Tenés filtros puestos. <strong>Con los filtros aplicados</strong> descarga lo que estás
          viendo; <strong>Todo</strong> descarga tus transacciones completas.
        </p>
      </Modal>
    </>
  );
}
