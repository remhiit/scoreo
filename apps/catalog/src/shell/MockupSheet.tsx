import type { Mockup } from './types'

const ISSUES = 'https://github.com/remhiit/scoreo/issues/'

/** One mockup: what it changes, what the design system gains, its screens. */
export function MockupSheet({ mockup }: { mockup: Mockup }) {
  return (
    <section className="cat-specimen" id={mockup.id} aria-labelledby={`${mockup.id}-title`}>
      <header className="cat-specimen__head">
        <h2 className="cat-specimen__title" id={`${mockup.id}-title`}>
          {mockup.title}
        </h2>
        {mockup.issue !== undefined && (
          <a
            className="cat-mockup__issue"
            href={`${ISSUES}${mockup.issue}`}
            target="_blank"
            rel="noreferrer"
          >
            Issue #{mockup.issue}
          </a>
        )}
        <p className="cat-specimen__usage">{mockup.summary}</p>
        {mockup.designSystemChanges.length > 0 && (
          <div className="cat-mockup__changes">
            <span className="cat-group__title">Changements du design system</span>
            <ul>
              {mockup.designSystemChanges.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <div className="cat-specimen__variants">
        {mockup.screens.map((screen) => (
          <figure
            key={screen.name}
            className={`cat-variant cat-variant--${screen.frame ?? 'phone'}`}
          >
            <figcaption className="cat-variant__name">{screen.name}</figcaption>
            <div className={`cat-frame cat-frame--${screen.frame ?? 'phone'}`}>
              {screen.render()}
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}
