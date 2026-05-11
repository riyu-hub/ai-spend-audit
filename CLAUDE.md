# Anthropic Claude Integration

## Model Support
Our Audit Engine supports the full Claude 3 and 3.5 family:
- **Claude 3.5 Sonnet:** Optimized for the best balance of cost and intelligence.
- **Claude 3 Opus:** Identified as the "High Performance" tier for complex auditing.
- **Claude 3 Haiku:** The target for most "Cost-Saving" recommendations due to its extreme efficiency.

## Technical Nuances
- **Prompt Caching:** Logic included to account for Anthropic's prompt caching discounts (up to 90% cheaper for repeat context).
- **Vision Tokens:** Capability to audit image-based costs for multimodal Claude requests.
