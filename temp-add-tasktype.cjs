const fs = require('fs');
const p = 'src/app/data/mockData.ts';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('export type CalendarTaskItem')) {
  const anchor = 'export type CalendarEvent = {';
  const insert = `export type CalendarTaskItem = {\n  id: string;\n  label: string;\n  done: boolean;\n};\n\n`;
  c = c.replace(anchor, insert + anchor);
}
c = c.replace(/  completed\?: boolean;\r?\n  status: PostStatus;/, '  completed?: boolean;\n  tasks?: CalendarTaskItem[];\n  status: PostStatus;');
fs.writeFileSync(p, c, 'utf8');
