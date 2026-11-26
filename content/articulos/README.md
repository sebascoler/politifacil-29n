# Manual Editorial SEO & GEO — PolitiFácil (`/articulos/`)

Cada archivo `.md` dentro de `content/articulos/<pais>/<slug>.md` (excepto `_templates/` y `README.md`) se compila automáticamente en una página HTML estática con esquema **Schema.org `Article` + `FAQPage` + `BreadcrumbList`**, enlace a herramientas de país y entrada en `sitemap.xml`, `llms.txt` y `/data/articles-index.json`.

## Comandos

```bash
# Crear un nuevo artículo desde plantilla
npm run article:new -- --template=guia-voto --country=es --slug=mi-slug --title="Título exacto"

# Validar datos y compilar todo el sitio estático
npm run build
```

Plantillas disponibles:
- `guia-voto`: cómo funciona la elección (cargos, escaños, calendario legal, resumen de fuerzas).
- `comparativa-eje`: contraste temático neutro por eje programático (tabla + convergencias/divergencias).
- `explicador-calendario`: análisis de citas electorales próximas en Latam, España o EE. UU.

## Reglas editoriales de neutralidad y GEO

1. **Cero opiniones o adjetivos valorativos**: describe qué propone cada fuerza o qué establece la norma, citando siempre el documento oficial o medio original.
2. **Respuesta directa en los primeros párrafos**: ideal para que lectores e IAs generativas extraigan datos verificados sin ambigüedad.
3. **Tabla comparativa estructurada** + mínimo **3 preguntas frecuentes (`faq`)** con respuestas directas y concretas.
4. **Al menos 1 fuente oficial (`sources`)** con URL `https://` verificada.

## Esquema del Frontmatter

```yaml
---
slug: ejemplo-slug-url
title: "Título SEO claro (55–75 caracteres)"
description: "Resumen factual para meta description y AI snippets (120–160 caracteres)."
country: es # es | ar | global | us | br | mx | co | cl | gt
category: guia-voto # guia-voto | comparativa | calendario | metodologia | datos
axisId: vivienda # opcional: id de eje en electionData.js
relatedParties: ["psoe", "pp", "vox"] # opcional: ids de partidos
keywords: ["elecciones", "guia"]
publishedAt: 2026-11-26
updatedAt: 2026-11-26
lang: es
featured: true
sources:
  - label: "Junta Electoral Central"
    url: "https://www.juntaelectoralcentral.es"
faq:
  - q: "¿Pregunta frecuente concreta?"
    a: "Respuesta directa de 1 a 3 frases con el dato verificado."
---
```
