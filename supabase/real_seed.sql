-- Great OrgÃ¢nico / seed real
-- Limpa a base e repovoa com dados coerentes entre Brenda, Hannah e Thiago.

truncate table public.posts;
truncate table public.goals;
truncate table public.ideas;
truncate table public.calendar_events;
truncate table public.history_events;
truncate table public.story_logs;
truncate table public.team_profiles;

insert into public.team_profiles (
  id,
  user_id,
  name,
  role,
  avatar,
  specialty,
  color,
  stats,
  radar,
  monthly_posts,
  email,
  avatar_url,
  bio
)
values
  (
    1,
    '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101',
    'Brenda',
    'Video Maker',
    'B',
    'Gravacao, edicao e reels',
    '#833AB4',
    '{"postsCreated":54,"avgEngagement":8.4,"goalsCompleted":4,"performance":94,"punctuality":96}'::jsonb,
    '[{"subject":"Criatividade","value":95},{"subject":"Pontualidade","value":96},{"subject":"Qualidade","value":93},{"subject":"Engajamento","value":91},{"subject":"Produtividade","value":90}]'::jsonb,
    '[{"month":"Jan","posts":11},{"month":"Fev","posts":12},{"month":"Mar","posts":15},{"month":"Abr","posts":16}]'::jsonb,
    'brendarayssa2706@gmail.com',
    '',
    'Gravacao, edicao e reels'
  ),
  (
    2,
    '2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02',
    'Hannah',
    'Designer de Social',
    'H',
    'Artes estaticas e stories',
    '#E1306C',
    '{"postsCreated":30,"avgEngagement":7.3,"goalsCompleted":3,"performance":89,"punctuality":97}'::jsonb,
    '[{"subject":"Criatividade","value":88},{"subject":"Pontualidade","value":97},{"subject":"Qualidade","value":90},{"subject":"Engajamento","value":84},{"subject":"Produtividade","value":86}]'::jsonb,
    '[{"month":"Jan","posts":7},{"month":"Fev","posts":8},{"month":"Mar","posts":7},{"month":"Abr","posts":8}]'::jsonb,
    'hannahleticia13@gmail.com',
    '',
    'Artes estaticas e stories'
  ),
  (
    3,
    '7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303',
    'Thiago',
    'Designer Editorial',
    'T',
    'Carrosseis e capas',
    '#FCAF45',
    '{"postsCreated":44,"avgEngagement":8.1,"goalsCompleted":3,"performance":92,"punctuality":94}'::jsonb,
    '[{"subject":"Criatividade","value":90},{"subject":"Pontualidade","value":94},{"subject":"Qualidade","value":94},{"subject":"Engajamento","value":87},{"subject":"Produtividade","value":88}]'::jsonb,
    '[{"month":"Jan","posts":10},{"month":"Fev","posts":11},{"month":"Mar","posts":11},{"month":"Abr","posts":12}]'::jsonb,
    'thiagomarquesdev23@hotmail.com',
    '',
    'Carrosseis e capas'
  );

insert into public.goals (id, sort_order, data)
values
  (
    1,
    0,
    '{
      "id": 1,
      "name": "Stories do mes",
      "category": "Conteudo",
      "responsibleId": 1,
      "responsibleIds": [1, 2, 3],
      "target": 168,
      "current": 168,
      "period": "Mes",
      "deadline": "2026-04-30",
      "description": "Meta compartilhada do time. O total e 168 stories e a distribuicao pode variar conforme a demanda do mes."
    }'::jsonb
  ),
  (
    2,
    1,
    '{
      "id": 2,
      "name": "Reels de conversao",
      "category": "Video",
      "responsibleId": 1,
      "responsibleIds": [1, 3],
      "target": 24,
      "current": 24,
      "period": "Mes",
      "deadline": "2026-05-05",
      "description": "Brenda e Thiago dividem a producao de reels que puxam alcance e geram conversa."
    }'::jsonb
  ),
  (
    3,
    2,
    '{
      "id": 3,
      "name": "Carrosseis de autoridade",
      "category": "Feed",
      "responsibleId": 2,
      "responsibleIds": [2, 3],
      "target": 12,
      "current": 11,
      "period": "Mes",
      "deadline": "2026-05-10",
      "description": "Hannah e Thiago mantem a linha editorial com pecas de valor e acabamento visual forte."
    }'::jsonb
  ),
  (
    4,
    3,
    '{
      "id": 4,
      "name": "Stories de aquecimento",
      "category": "Stories",
      "responsibleId": 2,
      "responsibleIds": [1, 2],
      "target": 48,
      "current": 36,
      "period": "Mes",
      "deadline": "2026-05-12",
      "description": "Stories de apoio para gerar rotina, prova social e preparando o publico para os lancamentos."
    }'::jsonb
  );

insert into public.ideas (id, sort_order, data)
values
  (
    1,
    0,
    '{
      "id": 1,
      "title": "Bastidores que vendem sem parecer venda",
      "description": "Sequencia de stories e reels com abertura humana, corte rapido e prova social da rotina.",
      "category": "Stories em video",
      "theme": "Bastidores de gravacao",
      "status": "Em producao",
      "script": "Abrir com o ambiente real, mostrar a equipe e fechar com a recompensa do resultado.",
      "responsibleId": 1
    }'::jsonb
  ),
  (
    2,
    1,
    '{
      "id": 2,
      "title": "Stories de conversao em 3 telas",
      "description": "Estrutura curta com dor, prova e chamada para acao usando linguagem simples.",
      "category": "Stories em foto",
      "theme": "Conversao rapida",
      "status": "Ideia",
      "responsibleId": 2
    }'::jsonb
  ),
  (
    3,
    2,
    '{
      "id": 3,
      "title": "Carrossel com prova de processo",
      "description": "Mostrar antes, durante e depois para reforcar autoridade sem excesso de texto.",
      "category": "Carrossel",
      "theme": "Autoridade editorial",
      "status": "Pronto",
      "script": "Primeiro slide com promessa, slides centrais com processo e ultimo slide com CTA.",
      "responsibleId": 3
    }'::jsonb
  ),
  (
    4,
    3,
    '{
      "id": 4,
      "title": "Campanha do ciclo compartilhado",
      "description": "Plano de alinhamento entre Brenda, Hannah e Thiago para fechar metas do mes em conjunto.",
      "category": "Feed",
      "theme": "Meta compartilhada",
      "status": "Em producao",
      "responsibleId": 1
    }'::jsonb
  );

insert into public.calendar_events (id, sort_order, data)
values
  (
    1,
    0,
    '{
      "id": 1,
      "title": "Alinhamento de stories do mes",
      "description": "Brenda, Hannah e Thiago fecham o plano para bater 168 stories no periodo.",
      "type": "Stories",
      "responsibleId": 1,
      "responsibleIds": [1, 2, 3],
      "status": "Agendado",
      "date": "2026-04-30",
      "time": "09:00",
      "checklist": [
        { "id": "calendar-1-1", "label": "Definir pauta", "done": true },
        { "id": "calendar-1-2", "label": "Separar responsaveis", "done": false },
        { "id": "calendar-1-3", "label": "Confirmar horario", "done": false }
      ]
    }'::jsonb
  ),
  (
    2,
    1,
    '{
      "id": 2,
      "title": "Gravacao de reels",
      "description": "Rodada de captaÃ§ao para os reels de conversao da semana.",
      "type": "Reels",
      "responsibleId": 1,
      "responsibleIds": [1],
      "status": "Em producao",
      "date": "2026-05-01",
      "time": "10:00",
      "checklist": [
        { "id": "calendar-2-1", "label": "Gravar abertura", "done": true },
        { "id": "calendar-2-2", "label": "Gravar cenas de apoio", "done": false },
        { "id": "calendar-2-3", "label": "Salvar backups", "done": false }
      ]
    }'::jsonb
  ),
  (
    3,
    2,
    '{
      "id": 3,
      "title": "Revisao do carrossel",
      "description": "Hannah e Thiago validam a arte e a narrativa antes de publicar.",
      "type": "Carrossel",
      "responsibleId": 3,
      "responsibleIds": [2, 3],
      "status": "Aprovado",
      "date": "2026-05-01",
      "time": "14:00",
      "checklist": [
        { "id": "calendar-3-1", "label": "Revisar copy", "done": true },
        { "id": "calendar-3-2", "label": "Checar arte final", "done": true },
        { "id": "calendar-3-3", "label": "Liberar agendamento", "done": false }
      ]
    }'::jsonb
  ),
  (
    4,
    3,
    '{
      "id": 4,
      "title": "Stories de conversao",
      "description": "Sequencia curta para aquecer audiencia e gerar resposta direta.",
      "type": "Stories",
      "responsibleId": 2,
      "responsibleIds": [2],
      "status": "Publicado",
      "date": "2026-05-02",
      "time": "08:30",
      "checklist": [
        { "id": "calendar-4-1", "label": "Validar legenda", "done": true },
        { "id": "calendar-4-2", "label": "Subir stories", "done": true },
        { "id": "calendar-4-3", "label": "Monitorar respostas", "done": false }
      ]
    }'::jsonb
  ),
  (
    5,
    4,
    '{
      "id": 5,
      "title": "Fechamento do ciclo",
      "description": "Revisao final das entregas e pendencias para a proxima semana.",
      "type": "Feed",
      "responsibleId": 3,
      "responsibleIds": [1, 3],
      "status": "Agendado",
      "date": "2026-05-03",
      "time": "16:00",
      "checklist": [
        { "id": "calendar-5-1", "label": "Fechar pendencias", "done": true },
        { "id": "calendar-5-2", "label": "Revisar entregas", "done": false },
        { "id": "calendar-5-3", "label": "Agendar proximos passos", "done": false }
      ]
    }'::jsonb
  );

insert into public.history_events (id, sort_order, data)
values
  (
    1,
    0,
    '{
      "id": 1,
      "type": "post",
      "title": "Post de reels publicado",
      "description": "Brenda publicou o reels de bastidores com fechamento forte.",
      "authorId": 1,
      "date": "2026-04-28",
      "result": "4.8k de engajamento no primeiro dia",
      "metrics": "54k de alcance"
    }'::jsonb
  ),
  (
    2,
    1,
    '{
      "id": 2,
      "type": "goal",
      "title": "Meta de stories concluida",
      "description": "A equipe fechou os 168 stories no periodo com uma distribuicao variavel entre os tres membros.",
      "authorId": 2,
      "date": "2026-04-30",
      "result": "Meta coletiva batida",
      "metrics": "100 por cento concluido"
    }'::jsonb
  ),
  (
    3,
    2,
    '{
      "id": 3,
      "type": "schedule",
      "title": "Calendario ajustado",
      "description": "Thiago reorganizou a fila do carrossel para encaixar melhor a aprovacao.",
      "authorId": 3,
      "date": "2026-05-01",
      "result": "Entrega mantida dentro do prazo",
      "metrics": "1 ajuste no fluxo"
    }'::jsonb
  ),
  (
    4,
    3,
    '{
      "id": 4,
      "type": "post",
      "title": "Stories de conversao no ar",
      "description": "Hannah publicou a sequencia com foco em resposta e prova social.",
      "authorId": 2,
      "date": "2026-05-02",
      "result": "Respostas organicas acima da media",
      "metrics": "1.5k interacoes"
    }'::jsonb
  ),
  (
    5,
    4,
    '{
      "id": 5,
      "type": "goal",
      "title": "Revisao do mes feita",
      "description": "Fechamento com leitura dos cards, dos grupos e das proximas metas.",
      "authorId": 1,
      "date": "2026-05-03",
      "result": "Planejamento do proximo ciclo iniciado",
      "metrics": "4 metas acompanhadas"
    }'::jsonb
  );

insert into public.story_logs (id, sort_order, data)
values
  (1, 0, '{"id":1,"date":"2026-04-03","time":"09:00","quantity":18,"mediaType":"video","madeById":1,"postedById":2,"notes":"Abertura do desafio com bastidores"}'::jsonb),
  (2, 1, '{"id":2,"date":"2026-04-06","time":"10:30","quantity":10,"mediaType":"video","madeById":1,"postedById":3,"notes":"Sequencia de cortes para reels"}'::jsonb),
  (3, 2, '{"id":3,"date":"2026-04-09","time":"09:45","quantity":8,"mediaType":"photo","madeById":1,"postedById":2,"notes":"Story com prova social"}'::jsonb),
  (4, 3, '{"id":4,"date":"2026-04-12","time":"08:40","quantity":8,"mediaType":"photo","madeById":1,"postedById":3,"notes":"Enquete de engajamento"}'::jsonb),
  (5, 4, '{"id":5,"date":"2026-04-18","time":"11:10","quantity":6,"mediaType":"video","madeById":1,"postedById":2,"notes":"Bastidor de edicao"}'::jsonb),
  (6, 5, '{"id":6,"date":"2026-04-24","time":"09:20","quantity":6,"mediaType":"photo","madeById":1,"postedById":3,"notes":"Fechamento do ciclo"}'::jsonb),
  (7, 6, '{"id":7,"date":"2026-04-04","time":"09:10","quantity":12,"mediaType":"video","madeById":2,"postedById":1,"notes":"Stories de referencia"}'::jsonb),
  (8, 7, '{"id":8,"date":"2026-04-11","time":"10:00","quantity":10,"mediaType":"photo","madeById":2,"postedById":3,"notes":"Teste de dinamica"}'::jsonb),
  (9, 8, '{"id":9,"date":"2026-04-19","time":"08:50","quantity":12,"mediaType":"video","madeById":2,"postedById":1,"notes":"Story de resultado"}'::jsonb),
  (10, 9, '{"id":10,"date":"2026-04-26","time":"09:30","quantity":8,"mediaType":"photo","madeById":2,"postedById":3,"notes":"Caixa de perguntas"}'::jsonb),
  (11, 10, '{"id":11,"date":"2026-04-29","time":"11:00","quantity":14,"mediaType":"video","madeById":2,"postedById":1,"notes":"Chamado rapido para acao"}'::jsonb),
  (12, 11, '{"id":12,"date":"2026-04-05","time":"09:40","quantity":8,"mediaType":"video","madeById":3,"postedById":1,"notes":"Abertura do carrossel de autoridade"}'::jsonb),
  (13, 12, '{"id":13,"date":"2026-04-08","time":"10:20","quantity":8,"mediaType":"video","madeById":3,"postedById":2,"notes":"Cortes de apoio para o feed"}'::jsonb),
  (14, 13, '{"id":14,"date":"2026-04-13","time":"08:30","quantity":8,"mediaType":"photo","madeById":3,"postedById":1,"notes":"Story de referencia visual"}'::jsonb),
  (15, 14, '{"id":15,"date":"2026-04-16","time":"09:50","quantity":8,"mediaType":"video","madeById":3,"postedById":2,"notes":"Bastidor de legenda e capa"}'::jsonb),
  (16, 15, '{"id":16,"date":"2026-04-21","time":"10:10","quantity":8,"mediaType":"photo","madeById":3,"postedById":1,"notes":"Story com resultado final"}'::jsonb),
  (17, 16, '{"id":17,"date":"2026-04-25","time":"11:30","quantity":8,"mediaType":"video","madeById":3,"postedById":2,"notes":"Fechamento editorial da semana"}'::jsonb),
  (18, 17, '{"id":18,"date":"2026-04-30","time":"09:15","quantity":8,"mediaType":"photo","madeById":3,"postedById":1,"notes":"Encerramento do ciclo mensal"}'::jsonb);

insert into public.posts (id, sort_order, data)
values
  (
    1,
    0,
    '{
      "id": 1,
      "title": "Bastidores da gravacao do reels da semana",
      "description": "Mostra o processo de criacao do roteiro ao corte final com foco em prova social e bastidor real.",
      "type": "Reels",
      "authorId": 1,
      "engagement": 4800,
      "reach": 54000,
      "date": "2026-04-28",
      "thumbnail": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 4200, "comments": 290, "saves": 180, "shares": 130},
      "checklist": [
        {"id": "1-1", "label": "Roteiro aprovado", "done": true},
        {"id": "1-2", "label": "CaptaÃ§ao concluida", "done": true},
        {"id": "1-3", "label": "Legenda revisada", "done": true}
      ],
      "comments": [
        {"id": "1-c1", "authorId": 2, "time": "09:18", "text": "Corte final ficou forte e direto."},
        {"id": "1-c2", "authorId": 3, "time": "09:44", "text": "A capa chama a atenÃ§Ã£o de primeira."}
      ],
      "files": [
        {"id": "1-f1", "name": "roteiro-reels.pdf", "size": "1.2 MB", "kind": "pdf"},
        {"id": "1-f2", "name": "bastidor-01.jpg", "size": "860 KB", "kind": "image"}
      ],
      "script": {
        "hook": "Mostra o que ninguem ve",
        "development": "Abertura com o set e as escolhas de enquadramento",
        "solution": "Entrega do corte final e melhoria do fluxo",
        "cta": "Salve para aplicar no proximo reels"
      },
      "approval": {"approvedBy": "Hannah", "date": "2026-04-28"}
    }'::jsonb
  ),
  (
    2,
    1,
    '{
      "id": 2,
      "title": "Stories de pergunta e resposta",
      "description": "Sequencia para puxar conversa, responder duvidas e manter a audiencia ativa durante o dia.",
      "type": "Stories",
      "authorId": 2,
      "engagement": 1500,
      "reach": 18000,
      "date": "2026-04-27",
      "thumbnail": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 1180, "comments": 96, "saves": 64, "shares": 42},
      "checklist": [
        {"id": "2-1", "label": "Capa pronta", "done": true},
        {"id": "2-2", "label": "Enquete adicionada", "done": true},
        {"id": "2-3", "label": "CTA final ajustado", "done": true}
      ],
      "comments": [
        {"id": "2-c1", "authorId": 1, "time": "08:12", "text": "A estrutura ficou muito clara."}
      ],
      "files": [
        {"id": "2-f1", "name": "stories-hannah.png", "size": "740 KB", "kind": "image"}
      ],
      "script": {
        "hook": "Qual parte trava mais no seu processo",
        "development": "Mostrar o problema em 3 telas curtas",
        "solution": "Responder com uma dica objetiva e aplicavel",
        "cta": "Me chama no direct com sua duvida"
      },
      "approval": {"approvedBy": "Brenda", "date": "2026-04-27"}
    }'::jsonb
  ),
  (
    3,
    2,
    '{
      "id": 3,
      "title": "Carrossel com prova de processo",
      "description": "Mostrar antes, durante e depois para reforcar autoridade sem excesso de texto.",
      "type": "Carrossel",
      "authorId": 3,
      "engagement": 3100,
      "reach": 37000,
      "date": "2026-04-26",
      "thumbnail": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 2650, "comments": 180, "saves": 150, "shares": 120},
      "checklist": [
        {"id": "3-1", "label": "Estrutura validada", "done": true},
        {"id": "3-2", "label": "Capa ajustada", "done": true},
        {"id": "3-3", "label": "Legenda fechada", "done": true}
      ],
      "comments": [
        {"id": "3-c1", "authorId": 2, "time": "10:05", "text": "A narrativa ficou muito forte."}
      ],
      "files": [
        {"id": "3-f1", "name": "carrossel-thiago.pdf", "size": "1.5 MB", "kind": "pdf"}
      ],
      "script": {
        "hook": "Veja o processo completo em 5 passos",
        "development": "Slides com contexto, execuÃ§Ã£o e prova real",
        "solution": "Fechar com aprendizado pratico",
        "cta": "Arraste ate o final e salve"
      },
      "approval": {"approvedBy": "Hannah", "date": "2026-04-26"}
    }'::jsonb
  ),
  (
    4,
    3,
    '{
      "id": 4,
      "title": "Antes e depois da landing page",
      "description": "Post de feed com leitura visual de transformacao e foco em resultado final.",
      "type": "Feed",
      "authorId": 1,
      "engagement": 5200,
      "reach": 61000,
      "date": "2026-04-24",
      "thumbnail": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 4700, "comments": 310, "saves": 220, "shares": 170},
      "checklist": [
        {"id": "4-1", "label": "Conteudo aprovado", "done": true},
        {"id": "4-2", "label": "Imagem final revisada", "done": true},
        {"id": "4-3", "label": "Publicacao feita", "done": true}
      ],
      "comments": [
        {"id": "4-c1", "authorId": 3, "time": "11:21", "text": "Essa comparacao ficou muito clara."}
      ],
      "files": [
        {"id": "4-f1", "name": "feed-before-after.png", "size": "1.0 MB", "kind": "image"}
      ],
      "script": {
        "hook": "Olha como a entrega mudou",
        "development": "Comparar problema inicial com o resultado final",
        "solution": "Mostrar a solucao aplicada na pratica",
        "cta": "Se quiser isso no seu perfil, salva este post"
      },
      "approval": {"approvedBy": "Thiago", "date": "2026-04-24"}
    }'::jsonb
  ),
  (
    5,
    4,
    '{
      "id": 5,
      "title": "Rotina de stories em 30 minutos",
      "description": "Reels curto com estrutura de rotina, mostrando cadencia e clareza no processo.",
      "type": "Reels",
      "authorId": 2,
      "engagement": 1400,
      "reach": 22000,
      "date": "2026-04-21",
      "thumbnail": "https://images.unsplash.com/photo-1516387938699-a93567ec168e?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 1220, "comments": 80, "saves": 60, "shares": 40},
      "checklist": [
        {"id": "5-1", "label": "Capa criada", "done": true},
        {"id": "5-2", "label": "Cortes fechados", "done": true},
        {"id": "5-3", "label": "CTA inserido", "done": true}
      ],
      "comments": [
        {"id": "5-c1", "authorId": 1, "time": "08:48", "text": "A rotina ficou muito objetiva."}
      ],
      "files": [
        {"id": "5-f1", "name": "rotina-stories.mp4", "size": "12.8 MB", "kind": "video"}
      ],
      "script": {
        "hook": "Como produzir stories rapido sem perder qualidade",
        "development": "Separar captaÃ§ao, legenda e revisÃ£o em blocos",
        "solution": "Usar uma rotina replicavel em todo dia Ãºtil",
        "cta": "Quer o modelo? Comenta rotina"
      },
      "approval": {"approvedBy": "Brenda", "date": "2026-04-21"}
    }'::jsonb
  ),
  (
    6,
    5,
    '{
      "id": 6,
      "title": "Capas que aumentam retenÃ§Ã£o",
      "description": "Post de feed com foco em hierarquia visual e leitura rapida no carrossel.",
      "type": "Feed",
      "authorId": 3,
      "engagement": 3600,
      "reach": 43000,
      "date": "2026-04-19",
      "thumbnail": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
      "status": "Publicado",
      "metrics": {"likes": 3200, "comments": 210, "saves": 140, "shares": 90},
      "checklist": [
        {"id": "6-1", "label": "Layout aprovado", "done": true},
        {"id": "6-2", "label": "Texto revisado", "done": true},
        {"id": "6-3", "label": "Arquivo exportado", "done": true}
      ],
      "comments": [
        {"id": "6-c1", "authorId": 2, "time": "09:02", "text": "A hierarquia da capa ficou excelente."}
      ],
      "files": [
        {"id": "6-f1", "name": "capa-carrossel.fig", "size": "2.1 MB", "kind": "doc"}
      ],
      "script": {
        "hook": "A capa decide se a pessoa para ou nao",
        "development": "Mostrar contraste entre capa fraca e capa forte",
        "solution": "Aplicar hierarquia simples e direta",
        "cta": "Salve para revisar suas capas depois"
      },
      "approval": {"approvedBy": "Hannah", "date": "2026-04-19"}
    }'::jsonb
  );

