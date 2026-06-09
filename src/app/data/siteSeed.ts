import type { CalendarEvent, Goal, HistoryEvent, Idea, Post, StoryLog, TeamMember } from './mockData';

export const seedPosts = [
  {
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
    "metrics": {
      "likes": 4200,
      "comments": 290,
      "saves": 180,
      "shares": 130
    },
    "checklist": [
      {
        "id": "1-1",
        "label": "Roteiro aprovado",
        "done": true
      },
      {
        "id": "1-2",
        "label": "Captacao concluida",
        "done": true
      },
      {
        "id": "1-3",
        "label": "Legenda revisada",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "1-c1",
        "authorId": 2,
        "time": "09:18",
        "text": "Corte final ficou forte e direto."
      },
      {
        "id": "1-c2",
        "authorId": 3,
        "time": "09:44",
        "text": "A capa chama a atencao de primeira."
      }
    ],
    "files": [
      {
        "id": "1-f1",
        "name": "roteiro-reels.pdf",
        "size": "1.2 MB",
        "kind": "pdf"
      },
      {
        "id": "1-f2",
        "name": "bastidor-01.jpg",
        "size": "860 KB",
        "kind": "image"
      }
    ],
    "script": {
      "hook": "Mostra o que ninguem ve",
      "development": "Abertura com o set e as escolhas de enquadramento",
      "solution": "Entrega do corte final e melhoria do fluxo",
      "cta": "Salve para aplicar no proximo reels"
    },
    "approval": {
      "approvedBy": "Hannah",
      "date": "2026-04-28"
    }
  },
  {
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
    "metrics": {
      "likes": 1180,
      "comments": 96,
      "saves": 64,
      "shares": 42
    },
    "checklist": [
      {
        "id": "2-1",
        "label": "Capa pronta",
        "done": true
      },
      {
        "id": "2-2",
        "label": "Enquete adicionada",
        "done": true
      },
      {
        "id": "2-3",
        "label": "CTA final ajustado",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "2-c1",
        "authorId": 1,
        "time": "08:12",
        "text": "A estrutura ficou muito clara."
      }
    ],
    "files": [
      {
        "id": "2-f1",
        "name": "stories-hannah.png",
        "size": "740 KB",
        "kind": "image"
      }
    ],
    "script": {
      "hook": "Qual parte trava mais no seu processo",
      "development": "Mostrar o problema em 3 telas curtas",
      "solution": "Responder com uma dica objetiva e aplicavel",
      "cta": "Me chama no direct com sua duvida"
    },
    "approval": {
      "approvedBy": "Brenda",
      "date": "2026-04-27"
    }
  },
  {
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
    "metrics": {
      "likes": 2650,
      "comments": 180,
      "saves": 150,
      "shares": 120
    },
    "checklist": [
      {
        "id": "3-1",
        "label": "Estrutura validada",
        "done": true
      },
      {
        "id": "3-2",
        "label": "Capa ajustada",
        "done": true
      },
      {
        "id": "3-3",
        "label": "Legenda fechada",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "3-c1",
        "authorId": 2,
        "time": "10:05",
        "text": "A narrativa ficou muito forte."
      }
    ],
    "files": [
      {
        "id": "3-f1",
        "name": "carrossel-thiago.pdf",
        "size": "1.5 MB",
        "kind": "pdf"
      }
    ],
    "script": {
      "hook": "Veja o processo completo em 5 passos",
      "development": "Slides com contexto, execucao e prova real",
      "solution": "Fechar com aprendizado pratico",
      "cta": "Arraste ate o final e salve"
    },
    "approval": {
      "approvedBy": "Hannah",
      "date": "2026-04-26"
    }
  },
  {
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
    "metrics": {
      "likes": 4700,
      "comments": 310,
      "saves": 220,
      "shares": 170
    },
    "checklist": [
      {
        "id": "4-1",
        "label": "Conteudo aprovado",
        "done": true
      },
      {
        "id": "4-2",
        "label": "Imagem final revisada",
        "done": true
      },
      {
        "id": "4-3",
        "label": "Publicacao feita",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "4-c1",
        "authorId": 3,
        "time": "11:21",
        "text": "Essa comparacao ficou muito clara."
      }
    ],
    "files": [
      {
        "id": "4-f1",
        "name": "feed-before-after.png",
        "size": "1.0 MB",
        "kind": "image"
      }
    ],
    "script": {
      "hook": "Olha como a entrega mudou",
      "development": "Comparar problema inicial com o resultado final",
      "solution": "Mostrar a solucao aplicada na pratica",
      "cta": "Se quiser isso no seu perfil, salva este post"
    },
    "approval": {
      "approvedBy": "Thiago",
      "date": "2026-04-24"
    }
  },
  {
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
    "metrics": {
      "likes": 1220,
      "comments": 80,
      "saves": 60,
      "shares": 40
    },
    "checklist": [
      {
        "id": "5-1",
        "label": "Capa criada",
        "done": true
      },
      {
        "id": "5-2",
        "label": "Cortes fechados",
        "done": true
      },
      {
        "id": "5-3",
        "label": "CTA inserido",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "5-c1",
        "authorId": 1,
        "time": "08:48",
        "text": "A rotina ficou muito objetiva."
      }
    ],
    "files": [
      {
        "id": "5-f1",
        "name": "rotina-stories.mp4",
        "size": "12.8 MB",
        "kind": "video"
      }
    ],
    "script": {
      "hook": "Como produzir stories rapido sem perder qualidade",
      "development": "Separar captacao, legenda e revisao em blocos",
      "solution": "Usar uma rotina replicavel em todo dia util",
      "cta": "Quer o modelo? Comenta rotina"
    },
    "approval": {
      "approvedBy": "Brenda",
      "date": "2026-04-21"
    }
  },
  {
    "id": 6,
    "title": "Capas que aumentam retencao",
    "description": "Post de feed com foco em hierarquia visual e leitura rapida no carrossel.",
    "type": "Feed",
    "authorId": 3,
    "engagement": 3600,
    "reach": 43000,
    "date": "2026-04-19",
    "thumbnail": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    "status": "Publicado",
    "metrics": {
      "likes": 3200,
      "comments": 210,
      "saves": 140,
      "shares": 90
    },
    "checklist": [
      {
        "id": "6-1",
        "label": "Layout aprovado",
        "done": true
      },
      {
        "id": "6-2",
        "label": "Texto revisado",
        "done": true
      },
      {
        "id": "6-3",
        "label": "Arquivo exportado",
        "done": true
      }
    ],
    "comments": [
      {
        "id": "6-c1",
        "authorId": 2,
        "time": "09:02",
        "text": "A hierarquia da capa ficou excelente."
      }
    ],
    "files": [
      {
        "id": "6-f1",
        "name": "capa-carrossel.fig",
        "size": "2.1 MB",
        "kind": "doc"
      }
    ],
    "script": {
      "hook": "A capa decide se a pessoa para ou nao",
      "development": "Mostrar contraste entre capa fraca e capa forte",
      "solution": "Aplicar hierarquia simples e direta",
      "cta": "Salve para revisar suas capas depois"
    },
    "approval": {
      "approvedBy": "Hannah",
      "date": "2026-04-19"
    }
  }
] as Post[];

export const seedGoals = [
  {
    "id": 1,
    "name": "Stories do mes",
    "category": "Conteudo",
    "responsibleId": 1,
    "responsibleIds": [
      1,
      2,
      3
    ],
    "target": 168,
    "current": 168,
    "period": "Mes",
    "deadline": "2026-04-30",
    "description": "Meta compartilhada do time. O total e 168 stories e a distribuicao pode variar conforme a demanda do mes."
  },
  {
    "id": 2,
    "name": "Reels de conversao",
    "category": "Video",
    "responsibleId": 1,
    "responsibleIds": [
      1,
      3
    ],
    "target": 24,
    "current": 24,
    "period": "Mes",
    "deadline": "2026-05-05",
    "description": "Brenda e Thiago dividem a producao de reels que puxam alcance e geram conversa."
  },
  {
    "id": 3,
    "name": "Carrosseis de autoridade",
    "category": "Feed",
    "responsibleId": 2,
    "responsibleIds": [
      2,
      3
    ],
    "target": 12,
    "current": 11,
    "period": "Mes",
    "deadline": "2026-05-10",
    "description": "Hannah e Thiago mantem a linha editorial com pecas de valor e acabamento visual forte."
  },
  {
    "id": 4,
    "name": "Stories de aquecimento",
    "category": "Stories",
    "responsibleId": 2,
    "responsibleIds": [
      1,
      2
    ],
    "target": 48,
    "current": 36,
    "period": "Mes",
    "deadline": "2026-05-12",
    "description": "Stories de apoio para gerar rotina, prova social e preparando o publico para os lancamentos."
  }
] as Goal[];

export const seedIdeas = [
  {
    "id": 1,
    "title": "Bastidores que vendem sem parecer venda",
    "description": "Sequencia de stories e reels com abertura humana, corte rapido e prova social da rotina.",
    "category": "Stories em video",
    "theme": "Bastidores de gravacao",
    "status": "Em producao",
    "script": "Abrir com o ambiente real, mostrar a equipe e fechar com a recompensa do resultado.",
    "responsibleId": 1
  },
  {
    "id": 2,
    "title": "Stories de conversao em 3 telas",
    "description": "Estrutura curta com dor, prova e chamada para acao usando linguagem simples.",
    "category": "Stories em foto",
    "theme": "Conversao rapida",
    "status": "Ideia",
    "responsibleId": 2
  },
  {
    "id": 3,
    "title": "Carrossel com prova de processo",
    "description": "Mostrar antes, durante e depois para reforcar autoridade sem excesso de texto.",
    "category": "Carrossel",
    "theme": "Autoridade editorial",
    "status": "Pronto",
    "script": "Primeiro slide com promessa, slides centrais com processo e ultimo slide com CTA.",
    "responsibleId": 3
  },
  {
    "id": 4,
    "title": "Campanha do ciclo compartilhado",
    "description": "Plano de alinhamento entre Brenda, Hannah e Thiago para fechar metas do mes em conjunto.",
    "category": "Feed",
    "theme": "Meta compartilhada",
    "status": "Em producao",
    "responsibleId": 1
  }
] as Idea[];

export const seedStoryLogs = [
  {
    "id": 1,
    "date": "2026-04-03",
    "time": "09:00",
    "quantity": 18,
    "mediaType": "video",
    "madeById": 1,
    "postedById": 2,
    "notes": "Abertura do desafio com bastidores"
  },
  {
    "id": 2,
    "date": "2026-04-06",
    "time": "10:30",
    "quantity": 10,
    "mediaType": "video",
    "madeById": 1,
    "postedById": 3,
    "notes": "Sequencia de cortes para reels"
  },
  {
    "id": 3,
    "date": "2026-04-09",
    "time": "09:45",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 1,
    "postedById": 2,
    "notes": "Story com prova social"
  },
  {
    "id": 4,
    "date": "2026-04-12",
    "time": "08:40",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 1,
    "postedById": 3,
    "notes": "Enquete de engajamento"
  },
  {
    "id": 5,
    "date": "2026-04-18",
    "time": "11:10",
    "quantity": 6,
    "mediaType": "video",
    "madeById": 1,
    "postedById": 2,
    "notes": "Bastidor de edicao"
  },
  {
    "id": 6,
    "date": "2026-04-24",
    "time": "09:20",
    "quantity": 6,
    "mediaType": "photo",
    "madeById": 1,
    "postedById": 3,
    "notes": "Fechamento do ciclo"
  },
  {
    "id": 7,
    "date": "2026-04-04",
    "time": "09:10",
    "quantity": 12,
    "mediaType": "video",
    "madeById": 2,
    "postedById": 1,
    "notes": "Stories de referencia"
  },
  {
    "id": 8,
    "date": "2026-04-11",
    "time": "10:00",
    "quantity": 10,
    "mediaType": "photo",
    "madeById": 2,
    "postedById": 3,
    "notes": "Teste de dinamica"
  },
  {
    "id": 9,
    "date": "2026-04-19",
    "time": "08:50",
    "quantity": 12,
    "mediaType": "video",
    "madeById": 2,
    "postedById": 1,
    "notes": "Story de resultado"
  },
  {
    "id": 10,
    "date": "2026-04-26",
    "time": "09:30",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 2,
    "postedById": 3,
    "notes": "Caixa de perguntas"
  },
  {
    "id": 11,
    "date": "2026-04-29",
    "time": "11:00",
    "quantity": 14,
    "mediaType": "video",
    "madeById": 2,
    "postedById": 1,
    "notes": "Chamado rapido para acao"
  },
  {
    "id": 12,
    "date": "2026-04-05",
    "time": "09:40",
    "quantity": 8,
    "mediaType": "video",
    "madeById": 3,
    "postedById": 1,
    "notes": "Abertura do carrossel de autoridade"
  },
  {
    "id": 13,
    "date": "2026-04-08",
    "time": "10:20",
    "quantity": 8,
    "mediaType": "video",
    "madeById": 3,
    "postedById": 2,
    "notes": "Cortes de apoio para o feed"
  },
  {
    "id": 14,
    "date": "2026-04-13",
    "time": "08:30",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 3,
    "postedById": 1,
    "notes": "Story de referencia visual"
  },
  {
    "id": 15,
    "date": "2026-04-16",
    "time": "09:50",
    "quantity": 8,
    "mediaType": "video",
    "madeById": 3,
    "postedById": 2,
    "notes": "Bastidor de legenda e capa"
  },
  {
    "id": 16,
    "date": "2026-04-21",
    "time": "10:10",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 3,
    "postedById": 1,
    "notes": "Story com resultado final"
  },
  {
    "id": 17,
    "date": "2026-04-25",
    "time": "11:30",
    "quantity": 8,
    "mediaType": "video",
    "madeById": 3,
    "postedById": 2,
    "notes": "Fechamento editorial da semana"
  },
  {
    "id": 18,
    "date": "2026-04-30",
    "time": "09:15",
    "quantity": 8,
    "mediaType": "photo",
    "madeById": 3,
    "postedById": 1,
    "notes": "Encerramento do ciclo mensal"
  }
] as StoryLog[];

export const seedCalendarEvents = [
  {
    "id": 1,
    "date": "2026-04-30",
    "time": "09:00",
    "type": "Stories",
    "title": "Alinhamento de stories do mes",
    "status": "Agendado",
    "checklist": [
      {
        "id": "calendar-1-1",
        "done": true,
        "label": "Definir pauta"
      },
      {
        "id": "calendar-1-2",
        "done": false,
        "label": "Separar responsaveis"
      },
      {
        "id": "calendar-1-3",
        "done": false,
        "label": "Confirmar horario"
      }
    ],
    "description": "Brenda, Hannah e Thiago fecham o plano para bater 168 stories no periodo.",
    "responsibleId": 1,
    "responsibleIds": [
      1,
      2,
      3
    ]
  },
  {
    "id": 2,
    "date": "2026-05-01",
    "time": "10:00",
    "type": "Reels",
    "title": "Gravacao de reels",
    "status": "Em produ??o",
    "checklist": [
      {
        "id": "calendar-2-1",
        "done": true,
        "label": "Gravar abertura"
      },
      {
        "id": "calendar-2-2",
        "done": false,
        "label": "Gravar cenas de apoio"
      },
      {
        "id": "calendar-2-3",
        "done": false,
        "label": "Salvar backups"
      }
    ],
    "description": "Rodada de captacao para os reels de conversao da semana.",
    "responsibleId": 1,
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 3,
    "date": "2026-05-01",
    "time": "14:00",
    "type": "Carrossel",
    "title": "Revisao do carrossel",
    "status": "Aprovado",
    "checklist": [
      {
        "id": "calendar-3-1",
        "done": true,
        "label": "Revisar copy"
      },
      {
        "id": "calendar-3-2",
        "done": true,
        "label": "Checar arte final"
      },
      {
        "id": "calendar-3-3",
        "done": false,
        "label": "Liberar agendamento"
      }
    ],
    "description": "Hannah e Thiago validam a arte e a narrativa antes de publicar.",
    "responsibleId": 3,
    "responsibleIds": [
      2,
      3
    ]
  },
  {
    "id": 4,
    "date": "2026-05-02",
    "time": "08:30",
    "type": "Stories",
    "title": "Stories de conversao",
    "status": "Publicado",
    "checklist": [
      {
        "id": "calendar-4-1",
        "done": true,
        "label": "Validar legenda"
      },
      {
        "id": "calendar-4-2",
        "done": true,
        "label": "Subir stories"
      },
      {
        "id": "calendar-4-3",
        "done": false,
        "label": "Monitorar respostas"
      }
    ],
    "description": "Sequencia curta para aquecer audiencia e gerar resposta direta.",
    "responsibleId": 2,
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 5,
    "date": "2026-05-03",
    "time": "16:00",
    "type": "Feed",
    "title": "Fechamento do ciclo",
    "status": "Agendado",
    "checklist": [
      {
        "id": "calendar-5-1",
        "done": true,
        "label": "Fechar pendencias"
      },
      {
        "id": "calendar-5-2",
        "done": false,
        "label": "Revisar entregas"
      },
      {
        "id": "calendar-5-3",
        "done": false,
        "label": "Agendar proximos passos"
      }
    ],
    "description": "Revisao final das entregas e pendencias para a proxima semana.",
    "responsibleId": 3,
    "responsibleIds": [
      1,
      3
    ]
  },
  {
    "id": 6,
    "date": "2026-05-27",
    "time": "17:00",
    "type": "Stories",
    "tasks": [],
    "title": "Xicara da clinica importa",
    "status": "Agendado",
    "addedById": 1,
    "completed": false,
    "description": "Video de social selling",
    "responsibleId": 1,
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 7,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Revisar roteiro 1780069309843",
    "status": "Agendado",
    "addedById": 2,
    "description": "Ajustar o roteiro antes da publicação.",
    "responsibleId": 2,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 8,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Revisar roteiro 1780069679915",
    "status": "Agendado",
    "addedById": 2,
    "description": "Ajustar o roteiro antes da publicação.",
    "responsibleId": 2,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 9,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Revisar roteiro 1780074663474",
    "status": "Agendado",
    "addedById": 2,
    "description": "Ajustar o roteiro antes da publicação.",
    "responsibleId": 2,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 10,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Revisar roteiro 1780075433946",
    "status": "Agendado",
    "addedById": 2,
    "description": "Ajustar o roteiro antes da publicação.",
    "responsibleId": 2,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 11,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa antiga 1780075570463",
    "status": "Agendado",
    "addedById": 1,
    "description": "Essa tarefa não pode voltar depois do reload.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 12,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa antiga 1780075815055",
    "status": "Agendado",
    "addedById": 1,
    "description": "Essa tarefa não pode voltar depois do reload.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 13,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa antiga 1780075942396",
    "status": "Agendado",
    "addedById": 1,
    "description": "Essa tarefa não pode voltar depois do reload.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 14,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa antiga 1780076243477",
    "status": "Agendado",
    "addedById": 1,
    "description": "Essa tarefa não pode voltar depois do reload.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 15,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa antiga 1780076336900",
    "status": "Agendado",
    "addedById": 1,
    "description": "Essa tarefa não pode voltar depois do reload.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 16,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Tarefa nova 1780076336901",
    "status": "Agendado",
    "addedById": 1,
    "description": "Nova tarefa criada depois da limpeza.",
    "responsibleId": 1,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      1
    ]
  },
  {
    "id": 17,
    "date": "2026-05-29",
    "time": "09:00",
    "type": "Reels",
    "tasks": [],
    "title": "Revisar roteiro 1780076387643",
    "status": "Agendado",
    "addedById": 2,
    "description": "Ajustar o roteiro antes da publicação.",
    "responsibleId": 2,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      2
    ]
  },
  {
    "id": 29,
    "date": "2026-06-01",
    "time": "13:00",
    "type": "Reels",
    "tasks": [
      {
        "id": "task-1780319365988-x5lvm3",
        "done": false,
        "note": "",
        "label": "viral",
        "checklist": false
      }
    ],
    "title": "viral",
    "status": "Agendado",
    "addedById": 3,
    "description": "asda",
    "responsibleId": 3,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      3
    ]
  },
  {
    "id": 30,
    "date": "2026-06-01",
    "time": "14:00",
    "type": "Reels",
    "tasks": [],
    "title": "carrosel",
    "status": "Agendado",
    "addedById": 3,
    "description": "dcfvcfvcf",
    "responsibleId": 3,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      3
    ]
  },
  {
    "id": 31,
    "date": "2026-06-02",
    "time": "11:00",
    "type": "Reels",
    "tasks": [
      {
        "id": "task-1780414014898-5qzop4",
        "done": true,
        "note": "",
        "label": "Vídeo do PMMA",
        "checklist": true
      }
    ],
    "title": "Vídeo PMMA - Nóticia",
    "status": "Publicado",
    "addedById": 3,
    "completed": true,
    "description": "Nóticia",
    "responsibleId": 3,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      3
    ]
  },
  {
    "id": 32,
    "date": "2026-06-05",
    "time": "10:00",
    "type": "Reels",
    "tasks": [
      {
        "id": "task-1780664539190-r4pwrr",
        "done": true,
        "note": "",
        "label": "carrossel 1",
        "checklist": false
      },
      {
        "id": "task-1780664543061-qdfhyz",
        "done": true,
        "note": "",
        "label": "carrossel 2",
        "checklist": false
      },
      {
        "id": "task-1780664547854-vfswrk",
        "done": true,
        "note": "",
        "label": "carrossel 3",
        "checklist": false
      },
      {
        "id": "task-1780664551710-j7k9jq",
        "done": true,
        "note": "",
        "label": "carrossel 4",
        "checklist": false
      },
      {
        "id": "task-1780664555681-fjilio",
        "done": true,
        "note": "",
        "label": "carrossel 5",
        "checklist": false
      },
      {
        "id": "task-1780664562542-vuzkdz",
        "done": true,
        "note": "",
        "label": "carrossel 6",
        "checklist": false
      },
      {
        "id": "task-1780688005045-3old9q",
        "done": true,
        "note": "",
        "label": "capa",
        "checklist": false
      },
      {
        "id": "task-1780688012962-henp8t",
        "done": true,
        "note": "",
        "label": "frase domingo",
        "checklist": false
      }
    ],
    "title": "Demanda do dia Thiago",
    "status": "Agendado",
    "addedById": 3,
    "completed": true,
    "completedAt": "2026-06-05",
    "description": "carrossel e hells noticia",
    "completedById": 3,
    "responsibleId": 3,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      3
    ]
  },
  {
    "id": 33,
    "date": "2026-06-08",
    "time": "10:00",
    "type": "Reels",
    "tasks": [],
    "title": "post dia dos namorados",
    "status": "Agendado",
    "addedById": 3,
    "completed": false,
    "description": "criar",
    "responsibleId": 3,
    "visualization": "Vídeo viral",
    "responsibleIds": [
      3
    ]
  }
] as CalendarEvent[];

export const seedHistoryTimeline = [
  {
    "id": 1,
    "date": "2026-04-28",
    "type": "post",
    "title": "Post de reels publicado",
    "result": "4.8k de engajamento no primeiro dia",
    "metrics": "54k de alcance",
    "authorId": 1,
    "description": "Brenda publicou o reels de bastidores com fechamento forte."
  },
  {
    "id": 100017,
    "date": "2026-06-08",
    "type": "post",
    "title": "Story criado",
    "result": "Agendado",
    "metrics": "2 stories",
    "authorId": 1,
    "description": "Brenda criado 2 story(ies) em 2026-06-08 09:00."
  },
  {
    "id": 2,
    "date": "2026-04-30",
    "type": "goal",
    "title": "Meta de stories concluida",
    "result": "Meta coletiva batida",
    "metrics": "100 por cento concluido",
    "authorId": 2,
    "description": "A equipe fechou os 168 stories no periodo com uma distribuicao variavel entre os tres membros."
  },
  {
    "id": 100016,
    "date": "2026-06-08",
    "type": "post",
    "title": "Story criado",
    "result": "Agendado",
    "metrics": "4 stories",
    "authorId": 1,
    "description": "Brenda criado 4 story(ies) em 2026-06-08 09:00."
  },
  {
    "id": 3,
    "date": "2026-05-01",
    "type": "schedule",
    "title": "Calendario ajustado",
    "result": "Entrega mantida dentro do prazo",
    "metrics": "1 ajuste no fluxo",
    "authorId": 3,
    "description": "Thiago reorganizou a fila do carrossel para encaixar melhor a aprovacao."
  },
  {
    "id": 100015,
    "date": "2026-06-05",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "1 stories",
    "authorId": 1,
    "description": "Brenda atualizado 1 story(ies) em 2026-06-05 09:00."
  },
  {
    "id": 4,
    "date": "2026-05-02",
    "type": "post",
    "title": "Stories de conversao no ar",
    "result": "Respostas organicas acima da media",
    "metrics": "1.5k interacoes",
    "authorId": 2,
    "description": "Hannah publicou a sequencia com foco em resposta e prova social."
  },
  {
    "id": 100014,
    "date": "2026-06-05",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "2 stories",
    "authorId": 1,
    "description": "Brenda atualizado 2 story(ies) em 2026-06-05 09:00."
  },
  {
    "id": 5,
    "date": "2026-05-03",
    "type": "goal",
    "title": "Revisao do mes feita",
    "result": "Planejamento do proximo ciclo iniciado",
    "metrics": "4 metas acompanhadas",
    "authorId": 1,
    "description": "Fechamento com leitura dos cards, dos grupos e das proximas metas."
  },
  {
    "id": 100013,
    "date": "2026-06-05",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "3 stories",
    "authorId": 1,
    "description": "Brenda atualizado 3 story(ies) em 2026-06-05 11:00."
  },
  {
    "id": 100012,
    "date": "2026-06-05",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "1 stories",
    "authorId": 1,
    "description": "Brenda atualizado 1 story(ies) em 2026-06-05 10:00."
  },
  {
    "id": 100011,
    "date": "2026-06-03",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "3 stories",
    "authorId": 1,
    "description": "Brenda atualizado 3 story(ies) em 2026-06-03 11:00."
  },
  {
    "id": 100010,
    "date": "2026-06-03",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "13 stories",
    "authorId": 1,
    "description": "Brenda atualizado 13 story(ies) em 2026-06-03 09:00."
  },
  {
    "id": 100009,
    "date": "2026-06-03",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "4 stories",
    "authorId": 1,
    "description": "Brenda atualizado 4 story(ies) em 2026-06-03 18:00."
  },
  {
    "id": 100008,
    "date": "2026-06-02",
    "type": "post",
    "title": "Story atualizado",
    "result": "Publicado",
    "metrics": "1 stories",
    "authorId": 1,
    "description": "Brenda atualizado 1 story(ies) em 2026-06-02 10:00."
  },
  {
    "id": 100007,
    "date": "2026-06-01",
    "type": "post",
    "title": "Story criado",
    "result": "Publicado",
    "metrics": "4 stories",
    "authorId": 1,
    "description": "Brenda criado 4 story(ies) em 2026-06-01 18:00."
  },
  {
    "id": 100006,
    "date": "2026-06-01",
    "type": "post",
    "title": "Story criado",
    "result": "Publicado",
    "metrics": "5 stories",
    "authorId": 1,
    "description": "Brenda criado 5 story(ies) em 2026-06-01 18:00."
  },
  {
    "id": 100005,
    "date": "2026-05-29",
    "type": "post",
    "title": "Story criado",
    "result": "Agendado",
    "metrics": "73 stories",
    "authorId": 1,
    "description": "Brenda criado 73 story(ies) em 2026-05-29 09:00."
  }
] as HistoryEvent[];

export const seedTeamMembers = [
  {
    "id": 1,
    "userId": "",
    "name": "Brenda",
    "role": "Video Make\"r",
    "avatar": "B",
    "specialty": "Gravação, edição e reels",
    "color": "#833AB4",
    "stats": {
      "postsCreated": 42,
      "avgEngagement": 7.8,
      "goalsCompleted": 5,
      "performance": 91,
      "punctuality": 94
    },
    "radar": [
      {
        "subject": "Criatividade",
        "value": 92
      },
      {
        "subject": "Pontualidade",
        "value": 94
      },
      {
        "subject": "Qualidade",
        "value": 90
      },
      {
        "subject": "Engajamento",
        "value": 88
      },
      {
        "subject": "Produtividade",
        "value": 86
      }
    ],
    "monthlyPosts": [
      {
        "month": "Jan",
        "posts": 8
      },
      {
        "month": "Fev",
        "posts": 9
      },
      {
        "month": "Mar",
        "posts": 11
      },
      {
        "month": "Abr",
        "posts": 14
      }
    ],
    "email": "brendarayssa2706@gmail.com",
    "password": "",
    "avatarUrl": "",
    "bio": "Gravação, edição e reels"
  },
  {
    "id": 2,
    "userId": "",
    "name": "Hannah",
    "role": "Designer de Social",
    "avatar": "H",
    "specialty": "Artes estáticas e stories",
    "color": "#E1306C",
    "stats": {
      "postsCreated": 38,
      "avgEngagement": 6.9,
      "goalsCompleted": 4,
      "performance": 88,
      "punctuality": 96
    },
    "radar": [
      {
        "subject": "Criatividade",
        "value": 89
      },
      {
        "subject": "Pontualidade",
        "value": 96
      },
      {
        "subject": "Qualidade",
        "value": 91
      },
      {
        "subject": "Engajamento",
        "value": 82
      },
      {
        "subject": "Produtividade",
        "value": 87
      }
    ],
    "monthlyPosts": [
      {
        "month": "Jan",
        "posts": 10
      },
      {
        "month": "Fev",
        "posts": 8
      },
      {
        "month": "Mar",
        "posts": 9
      },
      {
        "month": "Abr",
        "posts": 11
      }
    ],
    "email": "hannahleticia13@gmail.com",
    "password": "",
    "avatarUrl": "",
    "bio": "Artes estáticas e stories"
  },
  {
    "id": 3,
    "userId": "",
    "name": "Thiago",
    "role": "Designer Editorial",
    "avatar": "T",
    "specialty": "Carrosséis e capas",
    "color": "#FCAF45",
    "stats": {
      "postsCreated": 35,
      "avgEngagement": 7.2,
      "goalsCompleted": 4,
      "performance": 86,
      "punctuality": 89
    },
    "radar": [
      {
        "subject": "Criatividade",
        "value": 86
      },
      {
        "subject": "Pontualidade",
        "value": 89
      },
      {
        "subject": "Qualidade",
        "value": 92
      },
      {
        "subject": "Engajamento",
        "value": 84
      },
      {
        "subject": "Produtividade",
        "value": 83
      }
    ],
    "monthlyPosts": [
      {
        "month": "Jan",
        "posts": 7
      },
      {
        "month": "Fev",
        "posts": 8
      },
      {
        "month": "Mar",
        "posts": 9
      },
      {
        "month": "Abr",
        "posts": 11
      }
    ],
    "email": "thiagomarquesdev23@hotmail.com",
    "password": "",
    "avatarUrl": "",
    "bio": "Carrosséis e capas"
  }
] as unknown as TeamMember[];
