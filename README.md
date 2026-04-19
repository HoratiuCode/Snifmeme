# Snif Rug Scanner

Chrome extension that classifies memecoin chart screenshots and uploaded token data as `rug` or `safe` with a lightweight on-device logistic model.

## What it does

- Scans a chart screenshot or the current tab
- Reads CSV, JSON, or pasted text data
- Fetches live Dexscreener pair data from a token contract, pair address, or Dexscreener URL
- Produces a fast `rug` / `safe` signal with confidence and top contributing features
- Learns from your labeled examples and stores them locally

## Install

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `/Users/horatiubudai/ceo/Hacker/sipermeme`

## Data format

Best results come from CSV or JSON with fields like:

- `time`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `liquidity`
- `top_holder_percent`
- `top10percent`

The scanner also looks for risk and safety keywords in raw text such as `honeypot`, `mintable`, `locked`, `burned`, and `audited`.

For live ingestion, paste a token contract or pair address into the `Live DEX / contract` section and fetch the pair snapshot. The fetched liquidity, 24h volume, price change, txns, and age are folded into the scan.

## Notes

- The model is local and fast, but it is still probabilistic.
- Treat the output as a research signal, not a guarantee.
