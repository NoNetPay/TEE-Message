# NoNetTee - Decentralized Messaging Protocol

NoNetTee is a decentralized messaging protocol built on top of the NERO Chain, utilizing the DStack SDK for secure and private communication. The protocol enables users to send and receive messages in a decentralized manner while maintaining privacy and security.

## Protocol Overview

The protocol consists of several key components:

1. **DStack Integration**: Utilizes the DStack SDK for secure key derivation and message handling
2. **NERO Chain Integration**: Leverages the NERO Chain for message storage and retrieval
3. **Message Polling System**: Continuously monitors for new messages
4. **Multi-Chain Support**: Currently supports Ethereum and Solana key derivation

### Key Features

- Secure message encryption and decryption
- Multi-chain wallet support
- Real-time message polling
- RESTful API endpoints for various operations
- SQLite database for message persistence

## Deployed Contracts

- **USDC Mock Contract**: `0xec690C24B7451B85B6167a06292e49B5DA822fBE`
  - A mock implementation of USDC token for testing purposes
  - Supports minting and burning of tokens
  - Uses 6 decimal places like the real USDC

- **Yield Contract**: `0x2eDaF060FE9160D97B9f70007CBb476fA22249BC`
  - Implements a lending pool with the following features:
    - ETH to USDC collateral conversion
    - Direct USDC deposits
    - Borrowing with 75% LTV ratio
    - 5% interest rate on loans
    - Flash loan functionality with 0.1% fee
    - Health factor monitoring
    - Collateral withdrawal with safety checks

### Contract Features

#### USDC Mock Contract
- ERC20 compliant token implementation
- Minting and burning capabilities
- 6 decimal precision
- Simple ownership controls

#### Yield Contract
- **Collateral Management**:
  - Accepts ETH and converts to USDC via external protocol
  - Direct USDC deposits supported
  - Collateral withdrawal with LTV checks

- **Lending Features**:
  - 75% Loan-to-Value (LTV) ratio
  - 5% fixed interest rate
  - Health factor monitoring
  - Repayment functionality

- **Flash Loans**:
  - 0.1% fee on flash loans
  - Safety checks for loan repayment
  - Integration with flash loan receiver interface

- **External Protocol Integration**:
  - Interface for external lending protocols
  - ETH to USDC conversion
  - Admin controls for external protocol interactions

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- Bun runtime
- SQLite3
- DStack Simulator

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NoNetTee
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
bun run seed.js
```

5. Start the DStack simulator:
```bash
# Make sure the simulator is running on the default port
```

6. Start the application:
```bash
bun run dev
```

The application will start two servers:
- Bun server on port 8000 (DStack routes)
- Express server on port 4000 (API endpoints)

## API Endpoints

### DStack Routes (Port 8000)

- `GET /`: Get DStack client information
- `GET /tdx_quote`: Get TDX quote
- `GET /tdx_quote_raw`: Get raw TDX quote
- `GET /derive_key`: Derive a key
- `GET /ethereum`: Get Ethereum address
- `GET /solana`: Get Solana address

### Express Routes (Port 4000)

- Message handling endpoints
- User management endpoints
- Authentication endpoints

## Development

### Project Structure

```
NoNetTee/
├── contracts/         # Smart contract implementations
├── db/               # Database setup and migrations
├── middleware/       # Express middleware
├── poller/          # Message polling system
├── services/        # Business logic services
├── utils/           # Utility functions
├── index.ts         # Main application entry
└── config.js        # Configuration settings
```

### Running Tests

```bash
bun test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]

## Support

For support, please [add support contact information]
