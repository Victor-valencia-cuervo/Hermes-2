import { ArrowUpRight } from 'lucide-react';
import Title from '../components/Title';
import Ico from '../components/Ico';
import { TOOLS } from '../data/constants';

export default function ToolsView() {
  return (
    <>
      <Title>Herramientas web</Title>
      <div className="grid sm:grid-cols-2 gap-3">
        {TOOLS.map((t) => (
          <a key={t.url} href={t.url} target="_blank" rel="noreferrer" className="card flex items-center gap-4 hover:-translate-y-0.5 transition">
            <Ico name={t.icon} size={22} strokeWidth={1.5} style={{ color: 'var(--a)' }} /><span className="flex-1 text-sm">{t.label}</span><ArrowUpRight size={16} style={{ color: 'var(--m)' }} />
          </a>
        ))}
      </div>
    </>
  );
}
