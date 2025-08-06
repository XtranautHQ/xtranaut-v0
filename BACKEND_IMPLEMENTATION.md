# XRP Remittance Backend Implementation (Mongoose Edition)

## Overview

This implementation provides a complete backend system for XRP-based remittance services using **Mongoose ODM** for database operations. The system follows the workflow:

1. **Form Submission**: Sender submits transfer details (amount, recipient phone, etc.)
2. **Currency Conversion**: USD is converted to XRP using current market rates (simulated)
3. **XRP Transfer**: XRP is sent to local partner wallet in destination country
4. **KES Conversion**: XRP is converted to Kenyan Shillings (KES)
5. **M-Pesa Payment**: KES is sent to recipient via M-Pesa
6. **Notification**: Success/failure notification sent to sender

## Architecture

### Services

#### 1. RemittanceService (`src/services/remittanceService.ts`)
Main orchestration service that coordinates the entire workflow:
- Processes remittance requests
- Manages transaction state through all stages
- Handles error scenarios and rollbacks
- Coordinates with other services

#### 2. XRPService (`src/services/xrpService.ts`)
Handles XRP Ledger operations:
- Sends XRP to partner wallets
- Verifies transactions
- Manages wallet balances
- Simulates XRP transfers for MVP (replace with real XRPL integration)

#### 3. MpesaService (`src/services/mpesaService.ts`)
Integrates with M-Pesa API:
- Processes STK Push payments
- Validates phone numbers
- Handles payment callbacks
- Simulates M-Pesa for MVP (replace with real API)

#### 4. CurrencyService (`src/services/currencyService.ts`)
Manages exchange rates and conversions:
- Fetches XRP/USD rates
- Fetches USD/KES rates
- Performs currency conversions
- Caches rates for performance

#### 5. NotificationService (`src/services/notificationService.ts`)
Sends notifications to users:
- Email notifications for success/failure
- Processing updates
- HTML and text email templates
- Simulated for MVP (replace with real email service)

### API Endpoints

#### 1. `/api/remittance` (POST, GET)
Main remittance processing endpoint:
- **POST**: Initiates new remittance transaction
- **GET**: Retrieves transaction details or sender history

#### 2. `/api/mpesa/callback` (POST)
M-Pesa callback handler:
- Processes payment confirmations
- Updates transaction status
- Triggers final notifications

#### 3. `/api/rates` (GET)
Exchange rate information:
- Current XRP/USD and USD/KES rates
- Currency conversion calculator
- Rate sources and timestamps

#### 4. `/api/transactions` (POST, GET)
Legacy transaction endpoint (updated):
- Backwards compatible with existing form
- Integrates with new remittance system
- Maintains existing UI functionality

### Database Models (Mongoose Schemas)

#### RemittanceTransaction (`src/lib/models/RemittanceTransaction.ts`)
Complete transaction tracking with built-in methods:
```typescript
interface IRemittanceTransaction extends Document {
  _id: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  usdAmount: number;
  xrpAmount: number;
  kesAmount: number;
  fees: { serviceFeeUSD: number; networkFeeXRP: number };
  rates: { xrpToUsd: number; usdToKes: number };
  stages: { /* detailed stage tracking */ };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Instance methods
  updateStage(stage, status, additionalData?): Promise<this>;
  addError(stage, message, details?): Promise<this>;
  complete(): Promise<this>;
  fail(stage, reason): Promise<this>;
}

// Static methods
RemittanceTransaction.findBySender(email): Promise<IRemittanceTransaction[]>
RemittanceTransaction.getPendingTransactions(): Promise<IRemittanceTransaction[]>
RemittanceTransaction.getTransactionStats(timeframe): Promise<any[]>
```

#### ExchangeRate (`src/lib/models/ExchangeRate.ts`)
Historical exchange rate tracking:
```typescript
interface IExchangeRate extends Document {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
  isActive: boolean;
}

// Static methods
ExchangeRate.getLatestRate(from, to): Promise<IExchangeRate>
ExchangeRate.getRateHistory(from, to, hours): Promise<IExchangeRate[]>
```

#### PartnerWallet (`src/lib/models/PartnerWallet.ts`)
Partner wallet management:
```typescript
interface IPartnerWallet extends Document {
  address: string;
  country: string;
  currency: string;
  isActive: boolean;
  balance?: number;
  lastBalanceUpdate?: Date;
}

// Static methods
PartnerWallet.findByCountry(country): Promise<IPartnerWallet>
PartnerWallet.getActiveWallets(): Promise<IPartnerWallet[]>
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

The following packages were added:
- `xrpl`: XRP Ledger JavaScript library
- `axios`: HTTP client for API calls
- `node-cron`: Task scheduling (for rate updates)

### 2. Environment Configuration
Create `.env.local` with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/xrp-remittance

# XRP Configuration (Testnet for MVP)
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
XRP_SENDER_WALLET_SEED=sEdSKaCy2JT7JaM7v95H9SxkhP9wS2r

# Partner Wallets
KENYA_PARTNER_WALLET_ADDRESS=rDemoKenyaPartnerWallet123456789

# M-Pesa (Sandbox for MVP)
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

### 3. Initialize Database
```bash
# Initialize partner wallets and basic data
curl -X POST http://localhost:3000/api/admin/init

# Or check database health
curl http://localhost:3000/api/admin/init
```

### 4. Start the Application
```bash
npm run dev
```

## Usage Examples

### 1. Process Remittance
```javascript
const response = await fetch('/api/remittance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    senderName: 'John Doe',
    senderEmail: 'john@example.com',
    recipientName: 'Jane Smith',
    recipientPhone: '+254712345678',
    usdAmount: 100,
    country: 'Kenya'
  })
});

const result = await response.json();
console.log(result.transactionId); // Track this ID
```

### 2. Check Transaction Status
```javascript
const response = await fetch(`/api/remittance?transactionId=${txnId}`);
const { transaction } = await response.json();
console.log(transaction.status); // pending, processing, completed, failed
console.log(transaction.stages); // Detailed stage information
```

### 3. Get Exchange Rates
```javascript
const response = await fetch('/api/rates');
const { rates } = await response.json();
console.log(rates.XRP_USD.rate); // Current XRP to USD rate
console.log(rates.USD_KES.rate); // Current USD to KES rate
```

## Transaction Flow

### Success Flow
1. **Initiated** → Form submitted, transaction created
2. **XRP Send Processing** → Converting USD to XRP and sending to partner
3. **XRP Send Completed** → XRP successfully transferred
4. **KES Conversion Processing** → Converting XRP to KES
5. **KES Conversion Completed** → Currency conversion done
6. **M-Pesa Processing** → Initiating M-Pesa payment
7. **M-Pesa Completed** → Payment sent to recipient
8. **Notification Sent** → Success email sent to sender

### Error Handling
- Each stage can fail independently
- Failures are logged with detailed error messages
- Sender receives appropriate notifications
- Transaction status updated to 'failed'
- No charges if transaction fails

## MVP vs Production

### Current MVP Implementation
- **XRP Transfers**: Simulated with realistic delays and success rates
- **M-Pesa Payments**: Simulated based on phone number patterns
- **Exchange Rates**: Simulated with realistic fluctuations
- **Notifications**: Console logging instead of real emails

### Production Upgrades Needed
1. **Real XRP Integration**: Connect to XRPL mainnet with real wallets
2. **Real M-Pesa API**: Implement actual Safaricom M-Pesa STK Push
3. **Real Exchange Rates**: Use CoinGecko, Central Bank APIs
4. **Email Service**: Integrate SendGrid, AWS SES, or similar
5. **Error Handling**: Enhanced monitoring and alerting
6. **Security**: Wallet security, API key management, encryption
7. **Scaling**: Load balancing, database optimization
8. **Compliance**: KYC/AML requirements, transaction limits

## Testing

### Test Scenarios
1. **Successful Transfer**: Use phone numbers like +254712345678
2. **Invalid Phone**: Use numbers with '000' to simulate validation errors
3. **Payment Failure**: Use numbers with '999' to simulate M-Pesa failures
4. **Large Amounts**: Test with amounts > $1000 to trigger limits

### API Testing
```bash
# Test remittance
curl -X POST http://localhost:3000/api/remittance \
  -H "Content-Type: application/json" \
  -d '{
    "senderName": "Test User",
    "senderEmail": "test@example.com",
    "recipientName": "Test Recipient",
    "recipientPhone": "+254712345678",
    "usdAmount": 50,
    "country": "Kenya"
  }'

# Check status
curl "http://localhost:3000/api/remittance?transactionId=TXN123456"

# Get rates
curl "http://localhost:3000/api/rates"
```

## Monitoring and Logs

Transaction progress can be monitored through:
- Database transaction records with detailed stages
- Console logs for each service operation
- Error tracking in transaction.errors array
- API response status codes and messages

## Security Considerations

1. **API Validation**: All inputs validated and sanitized
2. **Rate Limiting**: Should be added for production
3. **Authentication**: Consider adding user authentication
4. **Wallet Security**: Use hardware security modules for production
5. **Audit Trail**: Complete transaction logging
6. **Data Encryption**: Sensitive data should be encrypted at rest

This implementation provides a solid foundation for a remittance service that can be gradually upgraded from MVP simulation to full production system.