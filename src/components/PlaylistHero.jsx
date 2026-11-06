import Cover from './Cover';

/** Hero de playlist: banner con arte difuminado, carátula grande, etiqueta,
 * nombre, meta y acciones. Se usa en Música, Perfil y Chat. */
export default function PlaylistHero({ art, icon, eyebrow, title, meta, description, actions }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] min-h-[12rem] flex items-end text-white"
      style={{ background: '#141416' }}>
      {art && <img src={art} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-90" />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, color-mix(in srgb, var(--a) 38%, transparent), rgba(0,0,0,.66))' }} />
      <div className="absolute inset-0 pointer-events-none rounded-[2rem]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.16), transparent 42%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16), inset 0 1px 0 rgba(255,255,255,.28)' }} />
      <div className="relative w-full p-5 flex items-center gap-4">
        {art
          ? <Cover src={art} className="w-24 h-24 rounded-3xl shadow-2xl shrink-0" iconSize={30} />
          : (
            <span className="w-24 h-24 rounded-3xl grid place-items-center shrink-0 text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg, var(--a), #4c1d95)' }}>
              {icon}
            </span>
          )}
        <div className="flex-1 min-w-0">
          {!!eyebrow && <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">{eyebrow}</p>}
          <p className="serif text-2xl sm:text-3xl font-semibold leading-tight line-clamp-2" title={title}>{title}</p>
          {!!meta && <p className="text-xs opacity-80 mt-0.5 truncate">{meta}</p>}
          {!!description && <p className="text-xs opacity-75 mt-1 line-clamp-2">{description}</p>}
          {!!actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
