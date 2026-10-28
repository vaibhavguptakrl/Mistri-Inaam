import type { PointRule, TransactionLine, GeneralSettings } from '../types'

export interface CalculationInputLine {
  id: string
  category: string
  brand: string
  quantityOrAmount: number
  overrideRule?: PointRule | null
  overrideReason?: string
}

export interface EvaluatedLine extends TransactionLine {
  id: string
  matchedRuleName: string
  calculationText: string
  isFallback: boolean
}

export interface BillEvaluationResult {
  lines: EvaluatedLine[]
  subtotalRupees: number
  subtotalPoints: number
  festivalMultiplier: number
  finalRupees: number
  finalPoints: number
  calculationSummary: string
}

/**
 * Matching priority (most specific wins):
 * 1. category + brand match
 * 2. category-only match (brand is blank or rule brand is empty)
 * 3. fallback to "Default rule" (default earn % from Settings)
 * Ties broken by sortOrder (lower number = higher priority).
 */
export function findMatchingRule(
  category: string,
  brand: string,
  rules: PointRule[]
): PointRule | null {
  const now = new Date().toISOString().split('T')[0]

  // Filter to active rules inside date range
  const activeRules = rules.filter(r => {
    if (!r.isActive) return false
    if (r.validFrom && r.validFrom > now) return false
    if (r.validTo && r.validTo < now) return false
    return true
  })

  // 1. Exact Category + Brand match
  if (brand.trim()) {
    const exactMatch = activeRules
      .filter(r => r.category.toLowerCase() === category.toLowerCase() && r.brand.toLowerCase() === brand.toLowerCase())
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]
    if (exactMatch) return exactMatch
  }

  // 2. Category only match (rule has empty brand meaning "any brand")
  const categoryMatch = activeRules
    .filter(r => r.category.toLowerCase() === category.toLowerCase() && (!r.brand || r.brand.trim() === ''))
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]
  if (categoryMatch) return categoryMatch

  return null
}

/**
 * Calculates a single bill line based on rule calculation type
 */
export function evaluateLine(
  input: CalculationInputLine,
  rules: PointRule[],
  settings: GeneralSettings
): EvaluatedLine {
  const rule = input.overrideRule || findMatchingRule(input.category, input.brand, rules)
  const rupeePerPoint = settings.rupeeValuePerPoint > 0 ? settings.rupeeValuePerPoint : 1.0

  let resultRupees = 0
  let resultPoints = 0
  let calculationText = ''
  let ruleName = ''
  let calculationType = rule?.calculationType || 'PERCENT_OF_AMOUNT'
  let rate = rule?.rate || settings.defaultEarnPercent
  let isFallback = false

  if (!rule) {
    // Fallback: Default Earn % from settings
    isFallback = true
    ruleName = `Default Rule (${settings.defaultEarnPercent}%)`
    resultRupees = (input.quantityOrAmount * settings.defaultEarnPercent) / 100.0
    calculationText = `₹${input.quantityOrAmount.toLocaleString('en-IN')} × ${settings.defaultEarnPercent}% = ₹${resultRupees.toFixed(2)}`
  } else {
    ruleName = rule.name
    // Check minimum purchase amount
    if (rule.minPurchaseAmount && input.quantityOrAmount < rule.minPurchaseAmount) {
      resultRupees = 0
      calculationText = `Below min purchase of ₹${rule.minPurchaseAmount}`
    } else {
      switch (rule.calculationType) {
        case 'PER_LITRE':
          // e.g. 1000 L × Rs 0.10/L = Rs 100
          resultRupees = input.quantityOrAmount * rule.rate
          calculationText = `${input.quantityOrAmount} L × ₹${rule.rate} = ₹${resultRupees.toFixed(2)}`
          break

        case 'PERCENT_OF_AMOUNT':
          // e.g. Rs 10,000 × 2% = Rs 200
          resultRupees = (input.quantityOrAmount * rule.rate) / 100.0
          calculationText = `₹${input.quantityOrAmount.toLocaleString('en-IN')} × ${rule.rate}% = ₹${resultRupees.toFixed(2)}`
          break

        case 'FIXED_PER_UNIT':
          // e.g. 5 units × Rs 50/unit = Rs 250
          resultRupees = input.quantityOrAmount * rule.rate
          calculationText = `${input.quantityOrAmount} pcs × ₹${rule.rate} = ₹${resultRupees.toFixed(2)}`
          break

        case 'FIXED_POINTS':
          // Flat points
          resultPoints = Math.round(rule.rate)
          resultRupees = resultPoints * rupeePerPoint
          calculationText = `Flat ${resultPoints} points`
          break
      }
    }
  }

  // Convert rupees to points if not already fixed points
  if (rule?.calculationType !== 'FIXED_POINTS') {
    const rawPoints = resultRupees / rupeePerPoint
    if (settings.roundingMode === 'round') {
      resultPoints = Math.round(rawPoints)
    } else if (settings.roundingMode === 'ceil') {
      resultPoints = Math.ceil(rawPoints)
    } else {
      resultPoints = Math.floor(rawPoints)
    }
  }

  // Cap points per line if rule specifies maxPointsPerLine
  if (rule?.maxPointsPerLine && rule.maxPointsPerLine > 0 && resultPoints > rule.maxPointsPerLine) {
    resultPoints = rule.maxPointsPerLine
    resultRupees = resultPoints * rupeePerPoint
    calculationText += ` (Capped at ${rule.maxPointsPerLine} pts)`
  }

  return {
    id: input.id,
    category: input.category,
    brand: input.brand,
    calculationType,
    rate,
    inputQuantity: input.quantityOrAmount,
    resultRupees,
    resultPoints,
    ruleName,
    matchedRuleName: ruleName,
    calculationText,
    isFallback,
    overridden: Boolean(input.overrideReason),
    overrideReason: input.overrideReason
  }
}

/**
 * Calculates a whole multi-line bill with optional festival multiplier
 */
export function evaluateBill(
  lines: CalculationInputLine[],
  rules: PointRule[],
  settings: GeneralSettings,
  isFestivalActive: boolean
): BillEvaluationResult {
  const evaluatedLines = lines.map(line => evaluateLine(line, rules, settings))

  const subtotalRupees = evaluatedLines.reduce((sum, l) => sum + l.resultRupees, 0)
  const subtotalPoints = evaluatedLines.reduce((sum, l) => sum + l.resultPoints, 0)

  const festivalMultiplier = isFestivalActive && settings.festivalMultiplier > 1 ? settings.festivalMultiplier : 1.0
  const finalRupees = subtotalRupees * festivalMultiplier
  const finalPoints = Math.round(subtotalPoints * festivalMultiplier)

  // Clean bill-style calculation summary string for ledger & plumber view
  const summaryLines: string[] = evaluatedLines.map(l => {
    const brandText = l.brand ? ` (${l.brand})` : ''
    return `${l.category}${brandText}: ${l.calculationText} = ${l.resultPoints} pts`
  })

  if (festivalMultiplier > 1) {
    summaryLines.push(`Festival Multiplier: ×${festivalMultiplier}`)
  }
  summaryLines.push(`Total Earned: ${finalPoints} pts (Worth ₹${finalRupees.toFixed(2)})`)

  return {
    lines: evaluatedLines,
    subtotalRupees,
    subtotalPoints,
    festivalMultiplier,
    finalRupees,
    finalPoints,
    calculationSummary: summaryLines.join('\n')
  }
}
