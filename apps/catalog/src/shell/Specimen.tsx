import type { ReactNode } from 'react'
import type { Story } from './types'

/** Renders `backticked` spans of a usage rule as code. */
function withCode(text: string): ReactNode[] {
  return text
    .split('`')
    .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))
}

/** One story: its usage rule, then each variant in its frame. */
export function Specimen({ story }: { story: Story }) {
  return (
    <section className="cat-specimen" id={story.id} aria-labelledby={`${story.id}-title`}>
      <header className="cat-specimen__head">
        <h2 className="cat-specimen__title" id={`${story.id}-title`}>
          {story.title}
        </h2>
        <p className="cat-specimen__usage">{withCode(story.usage)}</p>
        <p className="cat-specimen__covers">
          {story.covers.map((name) => (
            <code key={name}>{`<${name}>`}</code>
          ))}
        </p>
      </header>
      <div className="cat-specimen__variants">
        {story.variants.map((variant) => (
          <figure
            key={variant.name}
            className={`cat-variant cat-variant--${variant.frame ?? 'inline'}`}
          >
            <figcaption className="cat-variant__name">{variant.name}</figcaption>
            <div className={`cat-frame cat-frame--${variant.frame ?? 'inline'}`}>
              {variant.render()}
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}
