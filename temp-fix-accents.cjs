const fs = require('fs');
const files = [
  'src/app/pages/Content.tsx',
  'src/app/pages/Calendar.tsx',
  'src/app/pages/MetaInsights.tsx',
  'src/app/pages/Reports.tsx',
  'src/app/pages/Goals.tsx',
  'src/app/pages/Stories.tsx',
];
const replacements = [
  ['ConteÃºdo', 'Conteúdo'],
  ['ConteÃºdos', 'Conteúdos'],
  ['conteÃºdo', 'conteúdo'],
  ['conteÃºdos', 'conteúdos'],
  ['PublicaÃ§Ãµes', 'Publicações'],
  ['Metas concluÃ­das', 'Metas concluídas'],
  ['concluÃ­das', 'concluídas'],
  ['responsÃ¡vel', 'responsável'],
  ['responsÃ¡veis', 'responsáveis'],
  ['avanÃ§o', 'avanço'],
  ['mÃªs', 'mês'],
  ['Ãºnico', 'único'],
  ['Ãºnica', 'única'],
  ['Ãºnicos', 'únicos'],
  ['Ãºnicas', 'únicas'],
  ['Ã§Ã£o', 'ção'],
  ['Ã§Ãµ', 'ções'],
  ['Ã§', 'ç'],
  ['Ã£o', 'ão'],
  ['Ã£', 'ã'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ã¡', 'á'],
  ['Ãµ', 'õ'],
  ['Em produÃ§Ã£o', 'Em produção'],
  ['AtenÃ§Ã£o', 'Atenção'],
  ['PeÃ§as', 'Peças'],
  ['rÃ¡pida', 'rápida'],
  ['rÃ¡pido', 'rápido'],
  ['Leitura rÃ¡pida', 'Leitura rápida'],
  ['Leitura por responsÃ¡vel', 'Leitura por responsável'],
  ['Alcance total', 'Alcance total'],
];
for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) c = c.split(from).join(to);
  fs.writeFileSync(file, c, 'utf8');
}
