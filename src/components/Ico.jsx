import { Globe, Smartphone, MessageCircle, Mail, Code2, Video, Disc3, Sparkles, FileText, Minimize2, RefreshCw, Files, Palette } from 'lucide-react';

const ICONS = { Globe, Smartphone, MessageCircle, Mail, Code2, Video, Disc3, Sparkles, FileText, Minimize2, RefreshCw, Files, Palette };
export default function Ico({ name, ...p }) { const C = ICONS[name] || Globe; return <C {...p} />; }
