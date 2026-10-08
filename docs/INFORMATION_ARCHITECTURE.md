# Information architecture

The portal is Arabic-first and is built as a content platform rather than a one-page campaign site. The public URLs resolve through dynamic routes, but each page family has its own content type, filtering, detail view, and management workflow.

## Public portal

| Area | Routes |
| --- | --- |
| Identity | `/`, `/about`, `/about/leadership`, `/about/team`, `/about/structure`, `/about/governorates` |
| Programmes and opportunity | `/programs`, `/initiatives`, `/opportunities`, `/startup-support`, `/sme-support`, `/success-stories` |
| Observatory and policy | `/observatory`, `/observatory/problems`, `/observatory/solutions`, `/observatory/policies`, `/insights`, `/insights/reports`, `/insights/research`, `/insights/publications`, `/resources`, `/documents` |
| News and media | `/news`, `/events`, `/events/upcoming`, `/events/past`, `/calls`, `/media`, `/media/photos`, `/media/videos` |
| Participation | `/join`, `/volunteer`, `/submit/idea`, `/submit/problem`, `/submit/proposal`, `/partnerships`, `/contact`, `/faq` |
| Services | `/search`, `/admin`, `/en` and the English route family |

Every publishable content type gets a canonical detail route. Examples: `/news/:slug`, `/programs/:slug`, `/observatory/problems/:slug`, `/insights/reports/:slug`.

## Content lifecycle

`draft` → editorial review → `published` → update/archive. The public API returns only published records. Forms create submissions in `new` status; the administrator reviews and progresses them through the management API.

## Management scope

The `/admin` workspace manages portal content, events, programmes, initiatives, reports, media records, incoming submissions, assistant knowledge, administrative users and basic metrics. It is deliberately separate from the public navigation.

## Design direction

The visual system uses the official red-led El Adl Party treatment and its supplied mark. The information design is editorial and product-oriented: dense but readable pages, content indexes, filters, detail pages, breadcrumbs, and a recognisable working surface on the first screen rather than a marketing landing page.
