import { useMemo } from "react";
import { CheckSquare2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, GlassPanel, PageHeader, PageTransition, ProgressBar, SectionTitle, cn } from "../components/ui";
import { createStorageKey, useSharedState } from "../data/sharedState";

type ChecklistItem = {
  id: string;
  label: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
};

type ChecklistState = Record<string, boolean>;

const checklistSections: ChecklistSection[] = [
  {
    id: "entrada",
    title: "1. Entrada no sistema",
    description: "Confirme o básico antes de navegar pelo resto.",
    items: [
      { id: "login-ok", label: "O login abre sem erros e o acesso entra na conta certa." },
      { id: "login-error", label: "Quando o login falha, a mensagem explica o que fazer." },
      { id: "session", label: "A sessão permanece após recarregar e fecha corretamente ao sair." },
    ],
  },
  {
    id: "navegacao",
    title: "2. Navegação geral",
    description: "A navegação precisa se entender sozinha.",
    items: [
      { id: "sidebar-active", label: "A sidebar mostra claramente onde estou." },
      { id: "routes-clear", label: "Cada item do menu leva para a página certa." },
      { id: "mobile-menu", label: "No mobile, o menu abre e fecha sem travar." },
    ],
  },
  {
    id: "dashboard",
    title: "3. Dashboard",
    description: "Verifique se a leitura acontece rápido.",
    items: [
      { id: "dashboard-quick-read", label: "Entendo o dashboard em menos de 10 segundos." },
      { id: "dashboard-period", label: "Está claro qual período os números representam." },
      { id: "dashboard-delta", label: "Consigo distinguir aumento, queda e estabilidade." },
    ],
  },
  {
    id: "meta-insights",
    title: "4. Meta Insights",
    description: "Essa tela deve parecer dados reais, não repetição.",
    items: [
      { id: "insights-data", label: "A página parece leitura de dados reais da conta." },
      { id: "insights-filters", label: "Os filtros ficam claros e fáceis de mudar." },
      { id: "insights-empty", label: "Estados sem dados explicam o que falta." },
    ],
  },
  {
    id: "calendario",
    title: "5. Calendário",
    description: "Essa é a base da execução diária.",
    items: [
      { id: "calendar-me-vs-all", label: "Consigo alternar entre Meu e Todos sem confusão." },
      { id: "calendar-checklist", label: "O checklist da tarefa deixa claro o que foi feito." },
      { id: "calendar-actions", label: "Editar, duplicar e apagar têm comportamento previsível." },
    ],
  },
  {
    id: "equipe",
    title: "6. Equipe e perfil",
    description: "A visão de time precisa ser realmente de operação.",
    items: [
      { id: "team-overview", label: "A página de equipe mostra o time como time." },
      { id: "team-daily", label: "Consigo entender o que cada pessoa está fazendo hoje." },
      { id: "member-checklist", label: "O checklist diário por pessoa fica legível." },
    ],
  },
  {
    id: "metas",
    title: "7. Metas",
    description: "Metas precisam ser fáceis de acompanhar.",
    items: [
      { id: "goals-active", label: "Entendo o que é meta ativa e meta concluída." },
      { id: "goals-progress", label: "O progresso da meta é fácil de interpretar." },
      { id: "goals-owner", label: "Fica claro quem é responsável e qual é o prazo." },
    ],
  },
  {
    id: "stories",
    title: "8. Stories",
    description: "A operação precisa ser rápida e escaneável.",
    items: [
      { id: "stories-create", label: "Consigo cadastrar e editar um story rápido." },
      { id: "stories-status", label: "O status do story é fácil de entender." },
      { id: "stories-empty", label: "Estados vazios dão orientação útil." },
    ],
  },
  {
    id: "ideias",
    title: "9. Ideias",
    description: "Ideias precisam virar execução sem atrito.",
    items: [
      { id: "ideas-create", label: "É fácil registrar uma ideia sem atrito." },
      { id: "ideas-split", label: "Consigo distinguir ideia bruta de ideia pronta." },
      { id: "ideas-next-step", label: "Consigo mover a ideia para o calendário sem retrabalho." },
    ],
  },
  {
    id: "historico",
    title: "10. Histórico",
    description: "Histórico precisa servir como auditoria.",
    items: [
      { id: "history-filters", label: "Consigo filtrar por pessoa, tipo e período." },
      { id: "history-complete", label: "Concluídos e eventos importantes aparecem com clareza." },
      { id: "history-audit", label: "O histórico ajuda a auditar uma semana inteira." },
    ],
  },
  {
    id: "relatorios",
    title: "11. Relatórios",
    description: "Essa área precisa ser muito confiável.",
    items: [
      { id: "reports-preview", label: "Consigo abrir a pré-visualização do relatório." },
      { id: "reports-edit", label: "Consigo adicionar texto, imagens, URLs e feedback manual." },
      { id: "reports-pdf", label: "O PDF exportado parece igual ao preview." },
    ],
  },
  {
    id: "perfil-config",
    title: "12. Perfil e configurações",
    description: "Preferências precisam ser claras e seguras.",
    items: [
      { id: "profile-simple", label: "Consigo abrir meu perfil sem confusão." },
      { id: "settings-clear", label: "Fica claro o que muda quando eu salvo." },
      { id: "theme-toggle", label: "Trocar tema funciona em qualquer página." },
    ],
  },
  {
    id: "estados",
    title: "13. Estados vazios e erros",
    description: "A interface precisa explicar o que está acontecendo.",
    items: [
      { id: "empty-state", label: "Tela sem dados explica o próximo passo." },
      { id: "error-state", label: "Erros mostram orientação útil, não só falha." },
      { id: "loading-state", label: "Loading tem feedback visual e não parece travamento." },
    ],
  },
  {
    id: "dark-mode",
    title: "14. Modo escuro",
    description: "O dark mode precisa continuar legível.",
    items: [
      { id: "dark-contrast", label: "O contraste continua bom em todas as páginas." },
      { id: "dark-modal", label: "Modais e previews continuam confortáveis de ler." },
      { id: "dark-pdf", label: "O fundo do relatório em preview fica realmente preto." },
    ],
  },
  {
    id: "responsivo",
    title: "15. Responsividade",
    description: "A interface precisa sobreviver fora do desktop.",
    items: [
      { id: "responsive-desktop", label: "A tela funciona bem em notebook e monitor grande." },
      { id: "responsive-mobile", label: "O menu lateral e os modais funcionam no celular." },
      { id: "responsive-overflow", label: "Gráficos e tabelas não estouram a largura." },
    ],
  },
  {
    id: "fluxos",
    title: "16. Fluxos críticos",
    description: "Os fluxos principais precisam fechar sem erro.",
    items: [
      { id: "flow-calendar-dashboard", label: "Criar tarefa, marcar checklist e refletir no histórico/dashboard." },
      { id: "flow-goals", label: "Criar meta, acompanhar progresso e concluir sem ambiguidade." },
      { id: "flow-report", label: "Montar relatório, editar e exportar PDF batendo com o preview." },
    ],
  },
];

function buildInitialState(): ChecklistState {
  return checklistSections.reduce<ChecklistState>((accumulator, section) => {
    section.items.forEach((item) => {
      accumulator[item.id] = false;
    });
    return accumulator;
  }, {});
}

export function UsabilityChecklistPage() {
  const initialChecklistState = useMemo(() => buildInitialState(), []);
  const [state, setState] = useSharedState<ChecklistState>(createStorageKey("usability-checklist"), initialChecklistState);

  const totals = useMemo(() => {
    const allItems = checklistSections.flatMap((section) => section.items);
    const done = allItems.filter((item) => state[item.id]).length;
    return {
      total: allItems.length,
      done,
      percent: allItems.length > 0 ? Math.round((done / allItems.length) * 100) : 0,
    };
  }, [state]);

  const toggleItem = (id: string) => {
    setState((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const resetAll = () => {
    setState(buildInitialState());
    toast.success("Checklist reiniciada.");
  };

  const markAll = () => {
    const next = buildInitialState();
    Object.keys(next).forEach((key) => {
      next[key] = true;
    });
    setState(next);
    toast.success("Todos os itens foram marcados.");
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-2 sm:p-4">
        <PageHeader
          eyebrow="Checklist"
          title="Checklist de usabilidade"
          description="Use esta página para testar o sistema inteiro antes de trabalhar de fato. O progresso fica salvo automaticamente."
          actions={
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="secondary" onClick={markAll}>
                <CheckSquare2 className="h-4 w-4" />
                Marcar tudo
              </ActionButton>
              <ActionButton variant="secondary" onClick={resetAll}>
                <RotateCcw className="h-4 w-4" />
                Reiniciar
              </ActionButton>
            </div>
          }
        />

        <GlassPanel className="space-y-4 p-6">
          <SectionTitle
            title="Progresso geral"
            description="Acompanhe o quanto do teste já foi concluído."
          />
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-2">
              <ProgressBar value={totals.done} max={Math.max(totals.total, 1)} label="Itens concluídos" />
              <p className="text-sm text-muted-foreground">
                {totals.done} de {totals.total} itens concluídos
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-border/60 bg-background px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Conclusão</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{totals.percent}%</p>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-4">
          {checklistSections.map((section) => (
            <GlassPanel key={section.id} className="space-y-4 p-6">
              <SectionTitle title={section.title} description={section.description} />
              <div className="grid gap-3">
                {section.items.map((item) => {
                  const checked = Boolean(state[item.id]);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                        checked
                          ? "border-primary/25 bg-primary/5 text-foreground"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-white text-transparent",
                        )}
                      >
                        ✓
                      </span>
                      <span className="text-sm leading-6">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
