# 🌳 GreenArc — Urban Canopy Planning Tool

> **Visualise, plan, and evaluate urban tree-planting interventions across London — powered by geospatial analysis and AI-generated planning briefings.**

---

## Built for Urban Professionals

GreenArc is designed from the ground up as a working tool for the people who shape cities. It is not a research prototype or a public awareness dashboard — it is a decision-support platform aimed directly at the professionals responsible for making and defending planning decisions.

**Who it is for:**

**Urban planners and landscape architects** can use GreenArc to rapidly model the impact of proposed green interventions during the earliest stages of a project, long before a full environmental impact assessment is commissioned. The ability to draw zones, see temperature projections update in real time, and generate a written briefing in seconds compresses what would otherwise be days of desktop research into a single working session.

**City planning officials and local authority officers** can use the tool to evaluate proposals submitted by developers or community groups, stress-test financial justifications, and produce structured, evidence-grounded responses. The AI briefing is formatted specifically for inclusion in formal planning documentation — a deliberate design choice that removes friction from the path between analysis and submission.

**Policy advisors and mayoral staff** working on climate resilience, public health, or environmental equity strategies can use GreenArc to build the quantitative case for canopy investment at borough or citywide scale. The metrics output — temperature delta, cost, payback period, affected boroughs — maps directly onto the data formats required for Treasury Green Book appraisals and London Environment Strategy reporting.

**Urban researchers and academics** studying the Urban Heat Island effect, green infrastructure return on investment, or the spatial distribution of environmental risk will find GreenArc's open architecture straightforward to extend with alternative datasets, refined cooling models, or bespoke output formats.

GreenArc's value proposition is speed without sacrifice of rigour. The underlying cooling model is grounded in established urban forestry parameters. The financial constants reflect real-world planting and benefit data. The AI briefing is deliberately critical rather than promotional — it will flag a poorly conceived proposal as readily as it will endorse a well-designed one. The tool is meant to be trusted by professionals, and it is built accordingly.

---

## Designed for Everyone

GreenArc is a professional-grade tool that does not require professional training to use.

The interface is intentionally simple. There are no configuration files to edit, no coordinate systems to understand, no GIS software to install. A user opens the map, draws a shape around an area they care about, and the tool does the rest — calculating temperatures, estimating costs, identifying boroughs, and generating a plain-English briefing. The entire workflow can be completed in under two minutes by anyone who has never encountered urban planning software before.

This accessibility is a deliberate design principle, not a concession. The problems that GreenArc addresses — heat, air quality, mental health, neighbourhood liveability — are felt most acutely by ordinary residents, not by the professionals who plan for them. Giving non-specialists the same analytical tools as city hall means that community groups, residents' associations, school pupils, local journalists, and engaged citizens can all participate meaningfully in conversations about their urban environment.

**A tenant association** concerned about the lack of shade in a housing estate can draw a zone, produce a temperature reduction estimate, and arrive at a council meeting with a structured, costed proposal rather than a petition.

**A secondary school class** studying urban geography or climate change can interact directly with real London heat data, model the impact of planting decisions, and develop an intuitive understanding of the Urban Heat Island effect that no textbook diagram can replicate.

**A local journalist** covering a heatwave or a planning controversy can use GreenArc to generate independent, quantified analysis of a proposed intervention — or the absence of one — without relying solely on figures supplied by the developers or the council.

**A community garden organiser** exploring whether a stretch of vacant land could be planted can get a rapid, credible environmental and financial case together before approaching funders or landowners.

The simplicity of the interface means that the barrier to entry is not skill — it is simply the decision to try. GreenArc is for anyone who lives in a city and wants to understand, or change, the environment around them.

---

## Why Urban Green Spaces Matter

Cities are increasingly hostile environments for human wellbeing. Dense infrastructure, hard surfaces, vehicle traffic, and the near-total absence of nature create what researchers call "green deprivation" — a condition with measurable, serious consequences for both physical and mental health.

**The evidence is unambiguous:**

Urban green spaces — trees, parks, canopy cover, planted corridors — are not aesthetic luxuries. They are public health infrastructure.

### Mental Health

Studies consistently show that exposure to nature, even in small doses, significantly reduces psychological stress. Access to tree canopy and green space is associated with lower rates of depression and anxiety, reduced cortisol levels (the body's primary stress hormone), improved attention and cognitive performance — particularly in children with ADHD — and stronger feelings of social connectedness and community safety.

The mechanisms are well-documented. Natural environments activate the parasympathetic nervous system, encouraging the body out of its chronic fight-or-flight state. Even passive exposure — a tree-lined street seen from a hospital window — has been shown to accelerate post-surgical recovery. In dense urban environments, where stress is structural and chronic, trees are one of the few interventions capable of delivering these benefits at scale, passively, and for everyone.

### Physical Health

The physical health case is equally compelling. Urban tree canopy directly combats the Urban Heat Island (UHI) effect — the phenomenon where cities are significantly warmer than surrounding rural areas due to heat-absorbing surfaces, reduced vegetation, and anthropogenic heat generation. During summer heatwaves, temperature differentials between greened and ungreened urban neighbourhoods can exceed 8°C.

These temperature differences are not trivial. Heat-related illness disproportionately kills elderly, low-income, and chronically ill urban residents. Every degree of cooling attributable to tree canopy translates directly to avoided hospital admissions and reduced mortality. Beyond cooling, urban trees filter particulate matter (PM2.5), absorb nitrogen oxides and ozone precursors, and reduce noise pollution — each of which carries its own burden of cardiovascular and respiratory disease.

In London specifically, air quality and heat exposure are identified as two of the greatest preventable health risks facing the city's population. Green infrastructure is the most cost-effective tool available to address both simultaneously.

### The Equity Dimension

Green deprivation is not evenly distributed. The neighbourhoods with the least tree cover are overwhelmingly the same neighbourhoods with the lowest incomes, the highest rates of chronic illness, the worst air quality, and the greatest heat vulnerability. Planting trees is therefore not only an environmental intervention — it is a health equity intervention. GreenArc exists to help planners identify, evaluate, and make the case for precisely these kinds of targeted investments.

---

## What GreenArc Does

GreenArc is a web-based planning tool that lets urban planners and policymakers interactively explore the potential impact of tree-planting interventions across London.

A planner draws one or more polygon zones on a live heatmap of London's urban heat distribution. The tool immediately models how tree canopy at that location and density would reduce local temperatures, calculates planting costs and long-term financial returns, identifies the affected London boroughs, and generates a professional, AI-authored planning briefing suitable for submission to the Mayor's office.

The result is a rapid, evidence-grounded evaluation loop that compresses weeks of analysis into minutes.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (Vite)                           │
│           Interactive map · Polygon drawing · Metrics UI         │
│                     http://localhost:5173                        │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTP (REST)
┌─────────────────────────────▼────────────────────────────────────┐
│                     Backend (Express.js)                         │
│                      http://localhost:3001                       │
│                                                                  │
│  GET  /api/points         ← initial heatmap point cloud          │
│  POST /api/recalculate    ← temperature modelling + metrics      │
│  POST /api/briefing       ← Claude AI planning briefing          │
│                                                                  │
│  Services:                                                       │
│    heatmap.js   → Turf.js spatial analysis + cooling model       │
│    metrics.js   → Financial & environmental aggregation          │
│    borough.js   → Nominatim reverse geocoding                    │
│                                                                  │
│  Data:                                                           │
│    heatmap_points.json   ← pre-generated London grid             │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Anthropic API   │
                    │  claude-sonnet-4  │
                    └───────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key

### 1. Clone the repository

```bash
git clone https://github.com/your-org/greenarc.git
cd greenarc
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

### 3. Generate the heatmap data

The backend requires a pre-generated point cloud of London's urban heat grid. If you have a `london_grid.json` source file, run:

```bash
npm run generate
```

This converts `data/london_grid.json` → `data/heatmap_points.json`.

### 4. Start the backend

```bash
npm start
```

The server will start on `http://localhost:3001` and log the number of loaded heatmap points.

### 5. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Reference

Full API documentation is available in [`API_REFERENCE.md`](./API_REFERENCE.md). A summary:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/points` | Returns the full baseline heatmap point cloud |
| `POST` | `/api/recalculate` | Accepts GeoJSON polygons, returns updated temperatures and metrics |
| `POST` | `/api/briefing` | Accepts a metrics object, returns an AI-generated planning briefing |

### Request example — `/api/recalculate`

```json
{
  "polygons": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-0.15, 51.49],
          [-0.08, 51.49],
          [-0.08, 51.52],
          [-0.15, 51.52],
          [-0.15, 51.49]
        ]]
      }
    }
  ]
}
```

> Coordinates must follow the GeoJSON standard: `[longitude, latitude]` order.

### Response example — `/api/recalculate`

```json
{
  "points": [
    { "lat": 51.512, "lng": -0.091, "temp": 27.1 }
  ],
  "metrics": {
    "avgTempBefore": 29.4,
    "avgTempAfter": 28.1,
    "tempDelta": -1.3,
    "totalTrees": 1240,
    "totalAreaM2": 62000,
    "totalCost": 620000,
    "annualBenefit": 47120,
    "paybackYears": 13,
    "polygonCount": 1,
    "boroughs": ["Southwark", "Hackney"]
  }
}
```

---

## The Cooling Model

GreenArc's temperature modelling is based on established urban forestry research parameters:

| Parameter | Value | Basis |
|-----------|-------|-------|
| Tree density | 1 tree per 50 m² | Standard urban planting spacing |
| Cooling per tree | 0.003 °C | Per-tree evapotranspiration estimate |
| Minimum temperature | 22 °C | Lower bound — floor on modelled reduction |
| Maximum cooling per zone | 6 °C | Logarithmic cap — diminishing returns |

Cooling uses a logarithmic diminishing-returns curve rather than a linear relationship. This reflects the real-world dynamic where the first trees planted in a heat-stressed zone deliver the greatest marginal benefit, while additional trees continue to help but at a declining rate per tree.

The financial model uses the following constants:

| Parameter | Value |
|-----------|-------|
| Planting cost per tree | £500 |
| Annual benefit per tree | £38 (energy savings + air quality) |

---

## The AI Briefing

The `/api/briefing` endpoint calls `claude-sonnet-4` with a carefully constructed system prompt that positions the model as an expert urban planning advisor for the Mayor of London's office. The briefing:

- Evaluates the **spatial feasibility** of the proposed planting density within the named London boroughs
- Assesses the **physical realism** of the projected temperature reduction
- Reviews the **financial payback timeline** against real-world benchmarks
- Delivers a firm **recommendation** — approve, modify, or reject — with specific reasoning

The output is intentionally plain prose, two paragraphs, with no markdown or bullet points — formatted for direct inclusion in a planning submission document.

---

## Project Structure

```
greenarc/
├── README.md
├── API_REFERENCE.md
│
└── backend/
    ├── server.js               # Express app entry point
    ├── package.json
    ├── generate_heatmap.js     # One-time data generation script
    │
    ├── data/
    │   ├── london_grid.json    # Source grid (not committed — see setup)
    │   └── heatmap_points.json # Generated point cloud
    │
    ├── routes/
    │   ├── points.js           # GET /api/points
    │   ├── recalculate.js      # POST /api/recalculate
    │   └── briefing.js         # POST /api/briefing (Claude integration)
    │
    └── services/
        ├── heatmap.js          # Spatial analysis & cooling model (Turf.js)
        ├── metrics.js          # Financial & environmental aggregation
        └── borough.js          # Nominatim reverse geocoding
```

---

## Key Dependencies

### Backend

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and routing |
| `@anthropic-ai/sdk` | Claude API client |
| `@turf/turf` | Geospatial operations (area, point-in-polygon, centroid) |
| `cors` | Cross-origin request handling |
| `dotenv` | Environment variable management |

### Geocoding

Borough names are resolved via the [Nominatim](https://nominatim.openstreetmap.org/) reverse geocoding API using the centroid of each drawn polygon. The `User-Agent` header is set to `UrbanCanopy/1.0` in compliance with Nominatim's usage policy.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key |
| `PORT` | No | Backend port (default: `3001`) |

---

## CORS Configuration

The backend is configured to accept requests from `http://localhost:5173` (the default Vite dev server origin). If you deploy the frontend to a different origin, update the `cors` configuration in `backend/server.js`:

```js
app.use(cors({ origin: 'https://your-frontend-domain.com' }))
```

---

## Roadmap

GreenArc is under active development. The following features are planned for upcoming releases.

---

### 🌲 Species-Specific Tree Modelling *(In Development)*

The current model treats all trees as equivalent units of cooling and cost. The next major feature release will introduce a full tree species library, allowing planners to select from a curated catalogue of species appropriate for London's urban environment.

Each species will carry its own parameters — canopy spread, growth rate, water demand, cooling coefficient, maintenance cost, and lifespan — derived from urban forestry research and Transport for London / GLA planting guidance. A mature London plane tree and a newly planted silver birch have very different environmental profiles; the tool will model them accordingly.

This will allow planners to:

- Compare the long-term cost and cooling trajectory of different species mixes within the same zone
- Assess species suitability based on soil type, proximity to infrastructure, and projected climate conditions
- Produce species-level planting schedules as part of the exported output

---

### 📤 Exportable Planting Grids *(In Development)*

GreenArc will support the export of drawn zones as fully attributed planting grids — structured datasets that can be handed directly to a landscape contractor, uploaded to a GIS platform, or submitted as a planning annex.

Planned export formats include:

- **GeoJSON** — each tree as a point feature with species, expected canopy radius, and planting phase
- **CSV** — tabular format for cost scheduling and procurement workflows
- **PDF report** — a formatted one-page planning summary combining the map view, metrics table, and AI briefing, suitable for inclusion in a planning application or committee paper

The grid generation will respect real-world constraints — setbacks from kerbs, underground utilities buffers, and minimum inter-tree spacing — drawing on OS Open data and TfL asset layers where available.

---

### 👤 User Profiles & Project Persistence *(In Development)*

Currently, GreenArc is a stateless session tool — drawn zones and analysis are lost on page refresh. The upcoming user profile system will introduce full project persistence.

Planned capabilities include:

- **Saved projects** — planners can save, name, and return to multiple intervention scenarios across sessions
- **Version history** — track how a proposal has evolved over time, with the ability to compare metrics across versions
- **Team workspaces** — multiple users within the same local authority or practice will be able to collaborate on a shared project, leave notes, and hand off work between sessions
- **Submission history** — a log of generated AI briefings linked to the polygon and metrics state that produced them, providing an auditable record for planning files

User authentication will be handled via OAuth2, with support for Google and Microsoft accounts to align with the SSO environments common in local authority and professional practice settings.

---

### On the Longer Horizon

Further features under consideration for future releases include multi-city support beyond London, integration with real-time air quality sensor data, a scenario comparison view allowing side-by-side evaluation of two or more proposed interventions, and a public-facing read-only mode for community engagement.

---

## Contributing

Contributions are welcome from developers, urban researchers, and domain experts. Please open an issue before submitting a pull request for significant changes.

If you are a planning professional with domain expertise and an interest in shaping the tool's direction — particularly around cooling model parameters, species data, or export format requirements — we would especially welcome your input. Open an issue tagged `domain-expertise` and describe your background and interest.

---

## License

This project is open source. See `LICENSE` for details.

---

## Acknowledgements

- Urban heat data modelled from publicly available London climate research
- Borough geocoding via [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- Geospatial processing via [Turf.js](https://turfjs.org/)
- AI briefings generated by [Claude](https://www.anthropic.com/claude) (Anthropic)
- Inspired by the work of the [Greater London Authority](https://www.london.gov.uk/) on urban greening and the London Urban Forest Plan