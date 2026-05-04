import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { posts } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import {
  ActionButton,
  ChecklistItem,
  DetailGrid,
  EmptyState,
  FileBadge,
  GlassPanel,
  MemberChip,
  PageTransition,
  StatusBadge,
  TypeBadge,
  cn,
  formatLongNumber,
} from "../components/ui";

const tabs = ["Checklist", "Comentários", "Arquivos", "Roteiro", "Aprovação"] as const;

export function PostDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = posts.find((item) => String(item.id) === id);
  const [teamMembers] = useTeamProfiles();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Checklist");
  const [checklist, setChecklist] = useState(post?.checklist ?? []);

  useEffect(() => {
    setChecklist(post?.checklist ?? []);
  }, [post]);

  if (!post) {
    return (
      <PageTransition>
        <EmptyState
          title="Post não encontrado"
          description="O item solicitado não existe na base mockada atual."
        />
      </PageTransition>
    );
  }

  const member = teamMembers.find((item) => item.id === post.authorId)!;

  return (
    <PageTransition>
      <GlassPanel index={0}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </ActionButton>
            <TypeBadge value={post.type} />
            <StatusBadge value={post.status} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{post.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{post.description}</p>
              </div>

              <DetailGrid
                items={[
                  { label: "Tipo", value: post.type },
                  { label: "Responsável", value: member.name },
                  { label: "Data", value: post.date },
                  { label: "Engajamento", value: formatLongNumber(post.engagement) },
                ]}
              />
            </div>

            <div className="rounded-3xl bg-muted/45 p-4">
              <img src={post.thumbnail} alt={post.title} className="h-44 w-full rounded-3xl object-cover" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
                <div className="text-right text-sm text-muted-foreground">
                  <p>{formatLongNumber(post.reach)} de alcance</p>
                  <p>{post.metrics.saves} saves</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Checklist" ? (
        <GlassPanel index={1}>
          <div className="space-y-3">
            {checklist.map((item) => (
              <ChecklistItem
                key={item.id}
                label={item.label}
                done={item.done}
                onClick={() =>
                  setChecklist((previous) =>
                    previous.map((entry) =>
                      entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                    ),
                  )
                }
              />
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === "Comentários" ? (
        <GlassPanel index={1}>
          <div className="grid gap-4">
            {post.comments.map((comment) => {
              const author = teamMembers.find((item) => item.id === comment.authorId)!;

              return (
                <div key={comment.id} className="rounded-3xl bg-muted/45 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <MemberChip name={author.name} role={author.role} color={author.color} src={author.avatarUrl} />
                    <span className="text-sm text-muted-foreground">{comment.time}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-foreground">{comment.text}</p>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === "Arquivos" ? (
        <GlassPanel index={1}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {post.files.map((file) => (
              <FileBadge key={file.id} file={file} />
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === "Roteiro" ? (
        <GlassPanel index={1}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Gancho (0-3s)", value: post.script.hook },
              { label: "Desenvolvimento (3-15s)", value: post.script.development },
              { label: "Solução (15-25s)", value: post.script.solution },
              { label: "CTA (25-30s)", value: post.script.cta },
            ].map((section) => (
              <div key={section.label} className="rounded-3xl bg-muted/45 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{section.label}</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{section.value}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === "Aprovação" ? (
        <GlassPanel index={1} className="border-success/20 bg-success/8">
          <div className="rounded-3xl bg-success/12 p-6">
            <h2 className="text-2xl font-semibold text-foreground">Aprovado para publicação</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Validação registrada por {post.approval.approvedBy} em {post.approval.date}.
            </p>
          </div>
        </GlassPanel>
      ) : null}
    </PageTransition>
  );
}
