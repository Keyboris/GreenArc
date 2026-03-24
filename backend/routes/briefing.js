const { Router } = require('express')
const Anthropic = require('@anthropic-ai/sdk')

const SYSTEM_PROMPT = `You are an expert urban planning advisor for the Mayor of London's office.
You write clear, confident, data-driven briefings for senior policymakers and city councillors.
Keep your response to exactly 3 short paragraphs. Do not use bullet points, headers, or markdown formatting.
Write in plain English — authoritative but accessible. Reference the specific numbers and place names provided.`

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

    const userPrompt = `A planner has proposed planting ${metrics.totalTrees} trees across ${metrics.polygonCount} zone(s) in ${boroughList}, covering ${Math.round(metrics.totalAreaM2).toLocaleString()} m² in total. This is projected to reduce the average local temperature by ${Math.abs(metrics.tempDelta)}°C (from ${metrics.avgTempBefore}°C to ${metrics.avgTempAfter}°C). The total planting cost is £${metrics.totalCost.toLocaleString()}, with an estimated payback period of ${metrics.paybackYears} years based on annual energy savings and air quality benefits.

Write a concise planning briefing covering: (1) the environmental impact and why it matters for London specifically, (2) the financial case and value for public money, and (3) a practical recommendation on tree species or planting strategy suited to dense urban London neighbourhoods.`

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write('data: ' + event.delta.text + '\n\n')
        }
      }

      res.write('data: [DONE]\n\n')
      res.end()
    } catch (err) {
      console.error('Claude API error:', err)
      // Headers already sent — write error as SSE then close, or if not sent yet respond 500
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Briefing generation failed. Please try again.' })
      }
      res.write('data: [DONE]\n\n')
      res.end()
    }
  })

  return router
}
