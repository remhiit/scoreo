import type { AppScreen } from './types'

/** One screen of the app: what the player does there, then each state in a phone. */
export function ScreenSheet({ screen }: { screen: AppScreen }) {
  const id = `ecran-${screen.type}`
  return (
    <section className="cat-specimen" id={id} aria-labelledby={`${id}-title`}>
      <header className="cat-specimen__head">
        <h2 className="cat-specimen__title" id={`${id}-title`}>
          {screen.title}
        </h2>
        <p className="cat-specimen__usage">{screen.summary}</p>
        <p className="cat-specimen__covers">
          <code>{`Screen '${screen.type}'`}</code>
        </p>
      </header>
      <div className="cat-specimen__variants">
        {screen.states.map((state) => (
          <figure key={state.name} className={`cat-variant cat-variant--${state.frame ?? 'phone'}`}>
            <figcaption className="cat-variant__name">{state.name}</figcaption>
            <div className={`cat-frame cat-frame--${state.frame ?? 'phone'}`}>{state.render()}</div>
          </figure>
        ))}
      </div>
    </section>
  )
}
