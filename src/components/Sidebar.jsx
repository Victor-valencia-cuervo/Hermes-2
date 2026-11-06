import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PATHS } from '../data/routes';
import { X, PawPrint, Music, Radio, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import useStore from '../hooks/useStore';
import { NAV, BOTTOM_NAV } from '../data/constants';
import { APP_NAME } from '../lib/format';

// Buscar y Biblioteca viven dentro de Música (misma vista), así que se marcan por la URL.
function useActive(view) {
  const path = useLocation().pathname;
  const inSearch = /^\/musica\/(buscar|resultados)/.test(path); const inLib = /^\/musica\/biblioteca/.test(path);
  return (id) => (id === 'search' ? inSearch : id === 'library' ? inLib : id === 'music' ? view === 'music' && !inSearch && !inLib : view === id);
}

function NavList({ view, setView, close, ids, petsOn, onTogglePets, mini, onCollapse }) {
  const items = ids ? NAV.filter((n) => ids.includes(n.id)) : NAV;
  const isOn = useActive(view);
  return (
    <>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <span className="flex items-center gap-2.5">
          <img src="icon/Roxy-img-white.png" alt="Roxy" className="w-9 h-9 rounded-xl object-cover" draggable={false} />
          <span className="serif text-2xl tracking-[0.3em] uppercase" style={{ color: 'var(--a)' }}>{APP_NAME}</span>
        </span>
        {close && <button className="ico-btn" onClick={close} aria-label="Cerrar menú"><X size={20} /></button>}
        {onCollapse && <button className="ico-btn" onClick={onCollapse} aria-label="Ocultar el menú" title="Ocultar el menú"><PanelLeftClose size={20} /></button>}
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1 -mx-2 px-2 pb-2" style={{ scrollbarWidth: 'thin' }} aria-label="Principal">
        {items.map(({ id, label, I }) => (
          <Link key={id} to={PATHS[id]} onClick={() => close?.()} aria-current={isOn(id) ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 [@media(min-height:760px)]:py-3 rounded-2xl text-sm text-left transition ${isOn(id) ? 'acc-soft' : 'hover:bg-[var(--s2)]'}`}>
            <I size={18} strokeWidth={1.6} />{label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-between shrink-0 pt-3 border-t" style={{ borderColor: 'var(--bd)' }}>
        <p className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--m)' }}>v5.0</p>
        <span className="flex items-center">
          {mini?.music && (
            <button className="ico-btn relative" onClick={mini.onMusic}
              aria-label={`Mostrar música: ${mini.music.title}`} title={mini.music.title}
              style={{ color: 'var(--a)' }}>
              <Music size={18} />
              {mini.music.playing && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--a)' }} />}
            </button>
          )}
          {mini?.radio && (
            <button className="ico-btn relative" onClick={mini.onRadio}
              aria-label={`Mostrar radio: ${mini.radio.title}`} title={mini.radio.title}
              style={{ color: '#f59e0b' }}>
              <Radio size={18} />
              {mini.radio.playing && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </button>
          )}
          {onTogglePets && (
            <button className="ico-btn" onClick={onTogglePets} aria-pressed={!!petsOn} aria-label={petsOn ? 'Ocultar mascotas' : 'Mostrar mascotas'} title={petsOn ? 'Ocultar mascotas' : 'Mostrar mascotas'}
              style={{ color: petsOn ? 'var(--a)' : undefined }}><PawPrint size={18} /></button>
          )}
        </span>
      </div>
    </>
  );
}

export default function Sidebar({ view, setView, menu, setMenu, petsOn, onTogglePets, mini }) {
  const rest = NAV.filter((n) => !BOTTOM_NAV.includes(n.id)).map((n) => n.id);
  const tabs = BOTTOM_NAV.map((id) => NAV.find((n) => n.id === id)).filter(Boolean);
  const [more, setMore] = useState(false);
  const isOn = useActive(view);
  const moreActive = rest.includes(view);
  const [collapsed, setCollapsed] = useStore('h_side_hidden', false); // menú de PC oculto a mano (no se oculta solo)
  return (
    <>
      {collapsed && (
        <button onClick={() => setCollapsed(false)} className="hidden lg:grid fixed left-2 top-3 z-30 w-9 h-9 rounded-xl place-items-center glass active:scale-90 transition" aria-label="Mostrar el menú" title="Mostrar el menú"><PanelLeftOpen size={19} /></button>
      )}
      {!collapsed && <aside className="hidden lg:flex flex-col w-64 shrink-0 p-6 pb-4 border-r sticky top-0 self-start overflow-hidden" style={{ background: 'var(--s)', borderColor: 'var(--bd)', height: '100dvh', maxHeight: '100vh', paddingBottom: 'calc(1rem + var(--minibar-h, 0px))' }}>
        <NavList view={view} setView={setView} petsOn={petsOn} onTogglePets={onTogglePets} mini={mini} onCollapse={() => setCollapsed(true)} />
      </aside>}
      <div className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${menu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenu(false)} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Menú" aria-hidden={!menu}
        className={`lg:hidden glass fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] p-6 pt-[max(1.5rem,env(safe-area-inset-top))] flex flex-col shadow-2xl border-l-0 rounded-r-3xl transition-transform duration-300 ease-out ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavList view={view} setView={setView} close={() => setMenu(false)} ids={rest} petsOn={petsOn} onTogglePets={onTogglePets} mini={mini} />
      </div>
      {/* Barra inferior móvil: Inicio, Música, Comunidad, Notas + Más */}
      <nav aria-label="Principal móvil" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t pb-[env(safe-area-inset-bottom)]" style={{ borderColor: 'var(--bd)' }}>
        <div className="grid grid-cols-5">
          {tabs.map(({ id, label, I }) => {
            const active = isOn(id);
            return (
              <Link key={id} to={PATHS[id]} onClick={() => setMore(false)} aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium"
                style={{ color: active ? 'var(--a)' : 'var(--m)' }}>
                <I size={22} strokeWidth={active ? 2.2 : 1.6} />{label}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} aria-expanded={more} aria-label="Más opciones"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium"
            style={{ color: moreActive || more ? 'var(--a)' : 'var(--m)' }}>
            <MoreHorizontal size={22} strokeWidth={moreActive || more ? 2.2 : 1.6} />Más
          </button>
        </div>
      </nav>
      {/* Cuadrito Más: resto de opciones con sus iconos */}
      {more && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más opciones">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm fin" onClick={() => setMore(false)} aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 glass border-b-0 rounded-t-3xl rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sheet">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-sm font-medium">Más opciones</p>
              <button className="ico-btn" onClick={() => setMore(false)} aria-label="Cerrar más opciones"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {rest.map((id) => {
                const item = NAV.find((n) => n.id === id);
                if (!item) return null;
                const { label, I } = item;
                const active = view === id;
                return (
                  <Link key={id} to={PATHS[id]} onClick={() => setMore(false)} aria-current={active ? 'page' : undefined}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-[10px] font-medium transition min-h-[64px] ${active ? 'acc-soft' : 'hover:bg-[var(--s2)]'}`}
                    style={active ? undefined : { color: 'var(--m)' }}>
                    <I size={22} strokeWidth={active ? 2.2 : 1.6} />{label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
