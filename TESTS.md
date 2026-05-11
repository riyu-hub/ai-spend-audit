# Testing Suite Overview

I used **Vitest** to ensure the Audit Engine is mathematically sound.

## Test Cases Covered:
1. **Basic Calculation:** Verifies 1M tokens of GPT-4o equals exactly $5.00.
2. **Tiered Pricing:** Handles different rates for Input vs. Output tokens.
3. **Empty State:** Checks that dashboard doesn't crash with zero usage data.
4. **Forecasting Logic:** Validates "Burn Rate" predicts a 30-day month accurately.

**Total Passing Tests:** 7
**Status:** Green ✅
