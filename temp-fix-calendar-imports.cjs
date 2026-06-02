const fs = require('fs');
const p = 'src/app/pages/Calendar.tsx';
let c = fs.readFileSync(p, 'utf8');
const oldTop = `import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
  CheckCircle2,
  Menu,
  Plus,
} from "lucide-react";`;
const newTop = `import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDrag, useDrop } from "react-dnd";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
  CheckCircle2,
  Menu,
  Plus,
} from "lucide-react";`;
if (!c.includes(oldTop)) throw new Error('top import block not found');
c = c.replace(oldTop, newTop);
fs.writeFileSync(p, c, 'utf8');
