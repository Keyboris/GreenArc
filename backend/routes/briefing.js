const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')

const SYSTEM_PROMPT = `You are an expert urban planning advisor for the Mayor of London's office. Your objective is to provide a firm, polite, and strictly business-oriented evaluation of the proposed tree-planting intervention. 

Ground your briefing in real-world urban forestry research, London-specific climate data, and hard cost-benefit realities. Omit all conversational filler and pleasantries; deliver direct, actionable feedback that highlights both the environmental value and any logistical, spatial, or financial flaws in the provided plan. 

Keep your response to exactly 2 short paragraphs. Do not use bullet points, special characters (example: /n, *, etc.), headers, or markdown formatting. Write in plain English — authoritative but accessible. Reference the specific numbers and place names provided.`

const REQUIRED_FIELDS = [
  'avgTempBefore', 'avgTempAfter', 'tempDelta',
  'totalTrees', 'totalAreaM2', 'totalCost',
  'paybackYears', 'polygonCount', 'boroughs',
]

module.exports = function briefingRouter() {
  const router = Router()
  const anthropic = new Anthropic()

  router.post('/', async (req, res) => {
    const metrics = req.body

    for (const field of REQUIRED_FIELDS) {
      if (metrics[field] === undefined) {
        return res.status(400).json({ error: 'Missing required fields.' })
      }
    }

    const boroughList = metrics.boroughs?.length > 0
      ? metrics.boroughs.join(', ')
      : 'selected zones across London'

    const userPrompt = `
    A planner has proposed planting ${metrics.totalTrees} trees across ${metrics.polygonCount} zone(s)
    in ${boroughList}, covering ${Math.round(metrics.totalAreaM2).toLocaleString()} m² in total.
    This is projected to reduce the average local temperature by ${Math.abs(metrics.tempDelta)}°C
    (from ${metrics.avgTempBefore}°C to ${metrics.avgTempAfter}°C).
    The total planting cost is £${metrics.totalCost.toLocaleString()}, with an estimated payback
    period of ${metrics.paybackYears} years based on annual energy savings and air quality benefits.

    Critically evaluate this proposal. Your briefing must address: (1) the spatial feasibility of this planting density within the specified London boroughs, (2) the physical realism of the projected temperature reduction and the financial payback timeline, and (3) a firm recommendation on whether this plan should be approved, modified, or rejected, citing specific spatial or logistical constraints.
    `
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = message.content[0].text
      res.json({ briefing: text })
    } catch (err) {
      console.error('Claude API error:', err)
      res.status(500).json({ error: 'Briefing generation failed. Please try again.' })
    }
  })

  return router
}
