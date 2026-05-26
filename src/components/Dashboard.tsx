import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useAllSnapshots, useIntraday, useSnapshot } from '../hooks/useComprasData';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { usePresentationMode } from '../hooks/usePresentationMode';
import { useToasts } from '../hooks/useToasts';
import { applyFilters } from '../utils/analytics';
import { minutesSince } from '../utils/formatters';
import { hasSeenTour, runWelcomeTour } from '../services/welcomeTour';
import type { ComprasSnapshot } from '../types';
import AppNavbar from './AppNavbar';
import PeriodNav from './PeriodNav';
import DashboardContextBar from './DashboardContextBar';
import MinervaValues from './brand/MinervaValues';
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

const sectionVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};

const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  exit: {},
};

const blockVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } },
};

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

  // Welcome tour: roda na primeira visita do usuario, apos o dashboard montar
  // e os elementos data-tour aparecerem em tela. Aguardamos um pouco pra
  // dar tempo das animacoes de stagger entrarem.
  useEffect(() => {
    if (presentation.isActive) return;
    if (hasSeenTour()) return;
    const timer = window.setTimeout(() => {
      void runWelcomeTour();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [presentation.isActive]);

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
      <AppNavbar
        snapshot={activeSnapshot}
        activePeriod={activePeriod}
        onShare={() => setShareOpen(true)}
        onPresentation={presentation.toggle}
      />

      <PeriodNav
        filters={filtersApi.filters}
        isDefault={filtersApi.isDefault}
        onToggleOrigem={filtersApi.toggleOrigem}
        onToggleSexo={filtersApi.toggleSexo}
        onPeriod={filtersApi.setPeriod}
        onReset={filtersApi.reset}
        allSnapshots={allSnapshotsQuery.data}
      />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-5 sm:pt-6 space-y-5 sm:space-y-6">
        <DashboardContextBar snapshot={activeSnapshot} activePeriod={activePeriod} />

        {isLate && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card-tight flex items-start gap-3 border-amber-400 dark:border-amber-700 border-2"
          >
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-none" />
            <div className="text-sm">
              <strong className="block">RPA pode estar atrasado</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                A ultima captura do "Hoje" tem mais de 3 horas. O ciclo intraday esperado e de 30 min.
              </span>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activePeriod}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5 sm:space-y-6"
          >
            {showTodayEmpty ? (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-5 sm:space-y-6">
                <motion.div variants={blockVariants}>
                  <TodayEmptyState onSwitchPeriod={filtersApi.setPeriod} />
                </motion.div>
                <motion.div variants={blockVariants}>
                  <PeriodComparisonChart
                    all={allSnapshotsQuery.data}
                    isLoading={allSnapshotsQuery.isLoading}
                    filters={filtersApi.filters}
                  />
                </motion.div>
              </motion.div>
            ) : activeSnapshot ? (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-5 sm:space-y-6"
              >
                <motion.div variants={blockVariants}>
                  <KPIGrid
                    rows={filteredRows}
                    snapshotTotals={duxSnapshotTotals}
                    originTotals={duxOriginTotals}
                  />
                </motion.div>

                {/* Grid unificado: esquerda (charts + tabela), direita (insights + prova).
                    grid-auto-rows: min-content alinhado para a Prova "puxar" o fim e
                    eliminar o vazio antigo. */}
                <div
                  className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6"
                  style={{ gridAutoRows: 'min-content' }}
                >
                  <motion.div variants={blockVariants} className="lg:col-span-2 space-y-5 sm:space-y-6">
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
                    <ComprasTable
                      rows={filteredRows}
                      snapshotTotals={duxSnapshotTotals}
                      originTotals={duxOriginTotals}
                    />
                  </motion.div>

                  <motion.div variants={blockVariants} className="space-y-5 sm:space-y-6">
                    <BoiVacaSplitCard rows={filteredRows} />
                    <VolumeByOriginChart rows={filteredRows} originTotals={duxOriginTotals} />
                    <InsightsBlock
                      rows={filteredRows}
                      snapshotTotals={duxSnapshotTotals}
                      originTotals={duxOriginTotals}
                    />
                    <ProofPanel snapshot={activeSnapshot} />
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <footer className="pt-8 pb-2 flex flex-col items-center gap-4">
          <div className="w-full max-w-3xl">
            <MinervaValues variant="compact" tone="mono" />
          </div>
          <div className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            Compras Now Executivo - Minerva Foods | Fonte oficial: DUX/Compras Now
          </div>
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
