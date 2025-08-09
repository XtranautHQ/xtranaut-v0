# XRP Remittance Platform MVP

A cross-border remittance platform powered by XRP Ledger, designed for fast, secure, and cost-effective international money transfers.

## Features Implemented

### 1. Frontend - Optional Vault Toggle ✅
- Checkbox option: "Add $20 to savings vault?"
- Simulates savings feature for demo/pitch purposes
- No real money deduction, just UI demonstration

### 2. Frontend - Confirmation Message ✅
- Success message: "$100 sent. $12 saved compared to Western Union."
- Psychological impact for demo presentations
- Detailed transaction breakdown

### 3. Backend - Static Fee Deduction ✅
- Fixed network fee: 0.25 XRP
- XRP calculation: (Amount - FixedFee) / XRP Price
- Transparent fee breakdown

### 4. XRPL Bridge - FX Rate Source ✅
- Static USD→KES conversion rates
- Labeled FX source: "Central Bank of Kenya reference rate"
- Boosts demo credibility with official-sounding sources

### 5. Ledger Simulation - Ledger Time ✅
- Simulated ledger close timestamp
- Format: "Ledger Closed: 08:45:13 UTC"
- Adds realism for presentation/demo context

### 6. M-PESA Sandbox - Simulated Failure Flow ✅
- Mocked failure cases for testing
- Invalid phone numbers trigger specific errors
- Insufficient funds simulation
- Network timeout scenarios
- Strengthens narrative during pitch

### 7. Transaction Logging - Input Snapshot ✅
- Logs original input data for each transaction
- USD amount, recipient phone, XRP rate, country
- Valuable for demo replay, debugging, and auditability

## Technical Stack

- **Frontend**: Next.js 15.4.5, React 19.1.0, TypeScript
- **Styling**: Tailwind CSS 4
- **XRPL Integration**: xrpl.js 3.1.0
- **API**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Real-time Updates**: Polling-based status monitoring

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── remittance/
│   │       ├── route.ts           # Remittance API endpoint
│   │       └── status/
│   │           └── [transactionId]/
│   │               └── route.ts   # Transaction status API
│   ├── globals.css                # Global styles
│   ├── history/page.tsx           # Transaction history page
│   ├── layout.tsx                 # Root layout with XRP provider
│   ├── page.tsx                   # Home page
│   └── remittance/page.tsx        # Main remittance form page
├── components/
│   ├── ConfirmationModal.tsx      # Transaction success modal
│   ├── Header.tsx                 # Navigation header
│   ├── RemittanceForm.tsx         # Main remittance form
│   └── TransferStepper.tsx        # Transfer progress stepper
├── contexts/
│   └── XRPContext.tsx             # XRP price and state management
└── lib/
    ├── db.ts                      # MongoDB connection utility
    └── models/
        └── Transaction.ts          # Transaction database schema
```

## Key Features

### Real-time XRP Price Integration
- Fetches current XRP price from CoinGecko API
- Automatic price updates every 5 minutes
- Fallback pricing for demo purposes

### Comprehensive Form Validation
- Sender information validation (name, email)
- Receiver information validation (name, phone, country)
- Amount validation (min $10, max $10,000)
- Real-time error feedback

### Multi-Country Support
- Kenya (KES) - 160.5 exchange rate
- Nigeria (NGN) - 1500.0 exchange rate
- Ghana (GHS) - 12.5 exchange rate
- Uganda (UGX) - 3800.0 exchange rate
- Tanzania (TZS) - 2500.0 exchange rate

### Fee Comparison
- XRPL network fee: 0.25 XRP
- Western Union comparison: 8% fee
- Real-time savings calculation
- Transparent fee breakdown

### Complete Transfer Process
- **Step 1**: USD to XRP conversion with real-time pricing
- **Step 2**: XRP transfer to partner wallet via XRPL
- **Step 3**: M-PESA payout to recipient
- Real-time progress tracking with stepper UI
- MongoDB transaction logging and audit trail
- Simulated failure scenarios for testing

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xrp-remittance-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up MongoDB:
   - Install MongoDB locally or use MongoDB Atlas
   - Create a `.env.local` file with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/xrp-remittance
   ```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Sending Money
1. Navigate to the "Send Money" page
2. Fill in sender information (name, email)
3. Enter receiver details (name, phone, country)
4. Specify the amount in USD
5. Optionally enable savings vault
6. Review fee breakdown and savings
7. Submit the transaction
8. Watch real-time progress through the stepper UI
9. Receive confirmation when transfer completes

### Testing Failure Scenarios
Use these phone numbers to test failure scenarios:
- `0712345678` - Invalid phone number format
- `0723456789` - Insufficient funds in M-PESA account
- `0734567890` - Network timeout

### Transfer Process
The complete transfer process includes:

1. **USD to XRP Conversion** (2 seconds)
   - Real-time XRP price fetching
   - Fee calculation and deduction
   - XRP amount calculation

2. **XRP Transfer** (3 seconds)
   - XRPL transaction simulation
   - Partner wallet transfer
   - Ledger confirmation

3. **M-PESA Payout** (4 seconds)
   - Local currency conversion
   - M-PESA sandbox integration
   - Recipient notification

### Transaction Confirmation
After successful completion:
- Detailed transaction summary
- Savings comparison with Western Union
- XRPL transaction details (hash, ledger)
- M-PESA reference number
- FX rate information
- Vault status (if enabled)

## API Endpoints

### POST /api/remittance
Handles remittance transactions with XRPL integration.

**Request Body:**
```json
{
  "sender": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "receiver": {
    "name": "Jane Smith",
    "phone": "+254712345678",
    "country": "KE"
  },
  "amounts": {
    "usd": 100,
    "xrp": 192.31,
    "local": 16050,
    "localCurrency": "KES"
  },
  "fees": {
    "networkFee": 0.25,
    "totalFee": 0.25,
    "savings": 7.75
  },
  "vault": {
    "enabled": true,
    "amount": 20
  },
  "fxRate": {
    "usdToXrp": 0.52,
    "usdToLocal": 160.5,
    "source": "Central Bank of Kenya reference rate"
  }
}
```

**Response:**
```json
{
  "transactionId": "TXN-1703123456789",
  "status": "pending",
  "steps": {
    "usdToXrp": { "completed": false },
    "xrpTransfer": { "completed": false },
    "mpesaPayout": { "completed": false }
  }
}
```

### GET /api/remittance/status/[transactionId]
Check transaction status and progress.

**Response:**
```json
{
  "transactionId": "TXN-1703123456789",
  "status": "completed",
  "steps": {
    "usdToXrp": { 
      "completed": true, 
      "timestamp": "2023-12-21T10:30:58.789Z" 
    },
    "xrpTransfer": { 
      "completed": true, 
      "timestamp": "2023-12-21T10:31:01.789Z",
      "hash": "0x1234567890abcdef...",
      "ledgerIndex": 81234567
    },
    "mpesaPayout": { 
      "completed": true, 
      "timestamp": "2023-12-21T10:31:05.789Z",
      "reference": "MPESA-1703123456789"
    }
  },
  "xrplTransaction": {
    "hash": "0x1234567890abcdef...",
    "ledgerIndex": 81234567,
    "fee": 0.25,
    "amount": 192.31
  },
  "mpesaTransaction": {
    "reference": "MPESA-1703123456789",
    "status": "success",
    "amount": 16050
  }
}
```

## Demo Features

### Psychological Impact
- Clear savings comparison with traditional services
- Professional FX rate sourcing
- Realistic transaction processing simulation
- Comprehensive confirmation details

### Credibility Boosters
- Central Bank reference rates
- Ledger close timestamps
- Detailed transaction logging
- Professional error handling

### Pitch-Ready Features
- Failure scenario testing
- Comprehensive audit trail
- Real-time price updates
- Mobile-responsive design

## Future Enhancements

- [ ] Real XRPL integration
- [ ] M-PESA API integration
- [ ] Database persistence
- [ ] User authentication
- [ ] Transaction history
- [ ] Export functionality
- [ ] Multi-language support
- [ ] Advanced analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.
