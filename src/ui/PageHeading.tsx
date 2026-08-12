type PageHeadingProps = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function PageHeading({ eyebrow, title, subtitle }: PageHeadingProps) {
  return (
    <div className="page-heading">
      {eyebrow && <span>{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}
