import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useAllSnapshots, useIntraday, useSnapshot } from '../hooks/useComprasData';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { usePresentationMode } from '../hooks/usePresentationMode';
import { useToasts } from '../hooks/useToasts';
import { applyFilters } from '../utils/analytics';
import { minutesSince } from '../utils/formatters';
import type { ComprasSnapshot } from '../types';
import DashboardHeader from './DashboardHeader';
import PresetsBar from './PresetsBar';
import KPIGrid from './KPIGrid';
import PriceByOriginChart from './PriceByOriginChart';
import VolumeByOriginChart from './VolumeByOriginChart';
import PeriodComparisonChart from './PeriodComparisonChart';
import IntradayTrendChart from './IntradayTrendChart';
import BoiVacaSplitCard from './BoiVacaSplitCard';
import InsightsBlock from './InsightsBlock';
import ProofPanel from './ProofPanel';
import ComprasTable from './ComprasTable';
import TodayEmptyState from './TodayEmptyState';
import ShareMenu from './ShareMenu';
import Toaster from './Toaster';
import ExecutiveSummaryPDF from './ExecutiveSummaryPDF';
import DashboardSkeleton from './DashboardSkeleton';
import PresentationView from './PresentationView';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const filtersApi = useDashboardFilters();
  const activePeriod = filtersApi.filters.period;

  const activeSnapshotQuery = useSnapshot(activePeriod);
  const allSnapshotsQuery = useAllSnapshots();
  const intradayQuery = useIntraday(activePeriod === 'today');

  const presentation = usePresentationMode();
  const toasts = useToasts();

  const [shareOpen, setShareOpen] = useState(false);
  const pdfTargetRef = useRef<HTMLDivElement>(null);

  const activeSnapshot = activeSnapshotQuery.data ?? null;
  const todaySnapshot = allSnapshotsQuery.data?.today ?? null;
  const todayIsStale = useMemo(() => isStaleToday(todaySnapshot), [todaySnapshot]);
  const showTodayEmpty = activePeriod === 'today' && (todayIsStale || activeSnapshot === null);

  const filteredRows = useMemo(
    () => (activeSnapshot ? applyFilters(activeSnapshot, filtersApi.filters) : []),
    [activeSnapshot, filtersApi.filters],
  );

  // Os totais do DUX (snapshot.totals e snapshot.originTotals) representam TODAS as
  // origens/sexos. So' nao podemos usa-los quando o usuario aplica filtros parciais
  // de origem/sexo (o periodo NAO conta - ele apenas seleciona qual snapshot olhar,
  // os totais dentro do snapshot ja sao do periodo escolhido).
  const filtersAreFullSelection =
    filtersApi.filters.origens.length === 5 && filtersApi.filters.sexos.length === 2;
  const duxOriginTotals = filtersAreFullSelection ? activeSnapshot?.originTotals : undefined;
  const duxSnapshotTotals = filtersAreFullSelection ? activeSnapshot?.totals : undefined;

  const isLate = activePeriod === 'today' && activeSnapshot
    ? !todayIsStale && minutesSince(activeSnapshot.capturedAt) > 180
    : false;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['snapshot'] });
    queryClient.invalidateQueries({ queryKey: ['snapshots-all'] });
    queryClient.invalidateQueries({ queryKey: ['intraday'] });
    toasts.toast('Atualizando dados...', 'info', 2000);
  };

  if (presentation.isActive) {
    return (
      <PresentationView
        all={allSnapshotsQuery.data}
        isLoading={allSnapshotsQuery.isLoading}
        isFetching={allSnapshotsQuery.isFetching}
        filters={filtersApi.filters}
        onExit={() => presentation.deactivate()}
      />
    );
  }

  if (activeSnapshotQuery.isLoading && !activeSnapshot) {
    return <DashboardSkeleton />;
  }

  if (activeSnapshotQuery.error && !activeSnapshot) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="card-padded max-w-md text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Sem dados do Compras Now Executivo</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {activeSnapshotQuery.error instanceof Error
              ? activeSnapshotQuery.error.message
              : 'Aguarde o proximo ciclo do RPA.'}
          </p>
          <button className="btn-primary mt-4" onClick={handleRefresh}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          snapshot={activeSnapshot}
          activePeriod={activePeriod}
          isFetching={activeSnapshotQuery.isFetching}
          onShare={() => setShareOpen(true)}
          onPresentation={presentation.toggle}
        />

        {isLate && (
          <div className="card-tight flex items-start gap-3 border-amber-400 dark:border-amber-700 border-2 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-none" />
            <div className="text-sm">
              <strong className="block">RPA pode estar atrasado</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                A ultima captura do "Hoje" tem mais de 3 horas. O ciclo intraday esperado e de 30 min.
              </span>
            </div>
          </div>
        )}

        <PresetsBar
          filters={filtersApi.filters}
          isDefault={filtersApi.isDefault}
          onToggleOrigem={filtersApi.toggleOrigem}
          onToggleSexo={filtersApi.toggleSexo}
          onPeriod={filtersApi.setPeriod}
          onReset={filtersApi.reset}
          allSnapshots={allSnapshotsQuery.data}
        />

        {showTodayEmpty ? (
          <>
            <TodayEmptyState onSwitchPeriod={filtersApi.setPeriod} />
            <PeriodComparisonChart
              all={allSnapshotsQuery.data}
              isLoading={allSnapshotsQuery.isLoading}
              filters={filtersApi.filters}
            />
          </>
        ) : activeSnapshot ? (
          <>
            <KPIGrid
              rows={filteredRows}
              snapshotTotals={duxSnapshotTotals}
              originTotals={duxOriginTotals}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <PriceByOriginChart
                  rows={filteredRows}
                  snapshotTotals={duxSnapshotTotals}
                  originTotals={duxOriginTotals}
                />
                <PeriodComparisonChart
                  all={allSnapshotsQuery.data}
                  isLoading={allSnapshotsQuery.isLoading}
                  filters={filtersApi.filters}
                />
                {activePeriod === 'today' && (
                  <IntradayTrendChart
                    intraday={intradayQuery.data}
                    isLoading={intradayQuery.isLoading}
                    origens={filtersApi.filters.origens}
                    sexos={filtersApi.filters.sexos}
                  />
                )}
              </div>
              <div className="space-y-4 sm:space-y-6">
                <BoiVacaSplitCard rows={filteredRows} />
                <VolumeByOriginChart rows={filteredRows} originTotals={duxOriginTotals} />
                <InsightsBlock
                  rows={filteredRows}
                  snapshotTotals={duxSnapshotTotals}
                  originTotals={duxOriginTotals}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <ComprasTable
                  rows={filteredRows}
                  snapshotTotals={duxSnapshotTotals}
                  originTotals={duxOriginTotals}
                />
              </div>
              <div>
                <ProofPanel snapshot={activeSnapshot} />
              </div>
            </div>
          </>
        ) : null}

        <footer className="text-center text-xs pt-4" style={{ color: 'var(--text-faint)' }}>
          Compras Now Executivo - Minerva Foods | Fonte oficial: DUX/Compras Now
        </footer>
      </div>

      {activeSnapshot && (
        <div
          style={{
            position: 'fixed',
            left: -10000,
            top: 0,
            pointerEvents: 'none',
            opacity: 0,
          }}
          aria-hidden="true"
        >
          <ExecutiveSummaryPDF
            ref={pdfTargetRef}
            snapshot={activeSnapshot}
            allSnapshots={allSnapshotsQuery.data}
          />
        </div>
      )}

      {activeSnapshot && (
        <ShareMenu
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          snapshot={activeSnapshot}
          allSnapshots={allSnapshotsQuery.data}
          pdfTargetRef={pdfTargetRef}
          onNotify={(message, variant) => toasts.toast(message, variant)}
        />
      )}

      <Toaster toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}

function isStaleToday(snapshot: ComprasSnapshot | null): boolean {
  if (!snapshot) return true;
  const captured = new Date(snapshot.capturedAt);
  const now = new Date();
  return (
    captured.getFullYear() !== now.getFullYear() ||
    captured.getMonth() !== now.getMonth() ||
    captured.getDate() !== now.getDate()
  );
}
