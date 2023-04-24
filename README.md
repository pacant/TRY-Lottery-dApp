# TRY-dApp

TRY is a blockchain based lottery, with NFTs as prizes. The backend is implemented through a smart contract and the frontend with web3 JS.
This is a project for P2P-blockchain course @ University of Pisa.

# Requirements

- Truffle
- NodeJS
- Connection to an Ethereum network (Ganache, Infura...)
- Metamask

# Run
First, compile and migrate the contracts on a ethereum network (indicate target network in *truffle-config.js*) executing *truffle migrate --reset --network development*. I used a local network created with Ganache.
Import accounts on Metamask.
Then run the dApp with *npm run dev* for running on localhost:3000.

For further information, read report.pdf.
