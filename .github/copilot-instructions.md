# Copilot Custom Instructions — OrderShieldPro

## Frontend Design Skill

When working on frontend UI/UX tasks (components, pages, styling), follow these guidelines:

### Design Thinking

Before coding, understand the context and commit to a clear aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose an intentional aesthetic: refined/professional, luxury/clean, editorial/magazine, soft/pastel, industrial/utilitarian, etc. Pick what fits the product context and execute with precision.
- **Constraints**: Technical requirements (Angular 17+, standalone components, SCSS, i18n, RTL support).
- **Differentiation**: What makes this interface feel professionally crafted rather than generic?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. The key is intentionality — every design choice should feel deliberate.

### Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and default system fonts. Opt for distinctive choices that elevate the aesthetics. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Thoughtful layouts. Intentional asymmetry. Generous negative space OR controlled density. Grid-breaking elements where appropriate.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, and decorative borders.

### What to AVOID

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial as the only choice)
- Cliched color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and cookie-cutter component patterns
- Flat, lifeless cards with identical `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` everywhere
- Design that lacks context-specific character

### Implementation Standards

- Match implementation complexity to the aesthetic vision
- Minimalist/refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details
- Every component should feel intentionally designed for its specific context
- Use CSS variables for theming consistency
- Ensure responsive design and accessibility
- Support RTL layouts (Arabic language support)

### OrderShieldPro Context

This is a **trade protection / supplier verification platform**. The tone should be:
- **Trustworthy & Professional** — users are making business decisions based on this data
- **Clean & Authoritative** — convey credibility and reliability
- **Modern but not trendy** — timeless design that inspires confidence
