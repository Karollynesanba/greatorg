export function SettingsPage() {
  return (
    <div className="space-y-6 p-2 sm:p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Configurações</p>
        <h1 className="text-2xl font-semibold text-foreground">Preferências da conta</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Esta página foi deixada simples de propósito para centralizar preferências básicas no futuro.
        </p>
      </div>

      <section className="rounded-[24px] border border-border/60 bg-card/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-card/90">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Ajustes básicos</h2>
          <p className="text-sm text-muted-foreground">
            Espaço reservado para idioma, tema, notificações e outras preferências simples.
          </p>
        </div>
      </section>
    </div>
  );
}
