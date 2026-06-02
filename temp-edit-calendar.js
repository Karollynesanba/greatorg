const fs = require('fs');
const p = 'src/app/pages/Calendar.tsx';
let c = fs.readFileSync(p, 'utf8');
const oldImport = `import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
  Menu,
  Plus,
} from "lucide-react";`;
const newImport = `import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
  CheckCircle2,
  Menu,
  Plus,
} from "lucide-react";`;
c = c.replace(oldImport, newImport);
c = c.replace(`  addedById?: number;
};`, `  addedById?: number;
  completed?: boolean;
};`);
fs.writeFileSync(p, c, 'utf8');
