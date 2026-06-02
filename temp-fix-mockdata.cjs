const fs = require('fs');
const p = 'src/app/data/mockData.ts';
let c = fs.readFileSync(p, 'utf8');
const pattern = /addedById\?: number;\s*status: PostStatus;/;
if (!pattern.test(c)) throw new Error('pattern not found');
c = c.replace(pattern, 'addedById?: number;\n  completed?: boolean;\n  status: PostStatus;');
fs.writeFileSync(p, c, 'utf8');
