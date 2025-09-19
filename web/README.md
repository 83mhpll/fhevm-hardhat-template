# PrivateVote Web (Vite + React + Wagmi)

Minimal frontend for the FHEVM PrivateVote contract. Vote privately with encrypted inputs and decrypt tallies using the relayer SDK.

## Requirements

- Node.js 20+
- Sepolia wallet (Rabby or MetaMask; use only one wallet extension at a time)
- Deployed `PrivateVote` contract address

## Quick start

1) Install deps
```bash
cd web
npm install
```

2) Run dev server
```bash
npm run dev
```
Open the Local URL printed in the terminal.

3) In the UI
- Connect your wallet to Sepolia
- Paste the `PrivateVote` contract address (or set `VITE_PRIVATE_VOTE_ADDRESS` in an `.env` and restart dev)
- Click "Grant Read Access" once to allow your address to decrypt
- Click "Decrypt tallies" to read current counts
- Click a "Vote" button to cast an encrypted vote, then decrypt again

## Notes

- If multiple wallet extensions are installed, disable others and keep only one active to avoid `window.ethereum` conflicts.
- The app uses `@zama-fhe/relayer-sdk/web` for encryption and user-decryption.
