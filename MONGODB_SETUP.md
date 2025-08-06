# MongoDB Atlas Setup

## Environment Configuration

Create a `.env.local` file in the root directory with the following content:

```env
# MongoDB Atlas Connection String
# Replace with your actual MongoDB Atlas URI
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xrp-remittance?retryWrites=true&w=majority

# Other environment variables can be added here
NODE_ENV=development
```

## MongoDB Atlas Setup Steps

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Choose the free tier (M0)
   - Select your preferred cloud provider and region
   - Click "Create Cluster"

3. **Set Up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and password
   - Select "Read and write to any database"
   - Click "Add User"

4. **Set Up Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, you can allow access from anywhere (0.0.0.0/0)
   - For production, add your specific IP addresses

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and `<dbname>` with your actual values

6. **Install Dependencies**
   ```bash
   npm install mongodb mongoose
   ```

## API Endpoints

The following API endpoints are now available:

### POST /api/transactions
Save a new transaction to MongoDB

**Request Body:**
```json
{
  "transactionData": {
    "amount": "100.00",
    "savings": "8.50",
    "recipientAmount": "15000.00",
    "xrpAmount": "150.25",
    "snapshot": {
      "input": {
        "usdAmount": 100,
        "recipientPhone": "+254700000000",
        "xrpRate": 0.65,
        "country": "Kenya",
        "senderName": "John Doe",
        "senderEmail": "john@example.com",
        "recipientName": "Jane Doe",
        "addToVault": false
      },
      "calculation": {
        "xrpAmount": 150.25,
        "fixedFeeUSD": 0.16,
        "westernUnionFee": 8.50,
        "savings": 8.34,
        "recipientAmount": 15000
      },
      "ledgerTime": "2024-01-01T00:00:00.000Z",
      "fxSource": "Central Bank of Kenya reference rate"
    }
  }
}
```

### GET /api/transactions
Get all transactions with pagination

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of transactions per page (default: 10)

### GET /api/transactions/[id]
Get a specific transaction by ID

### PUT /api/transactions/[id]
Update a specific transaction

## Database Schema

Transactions are stored with the following structure:

```typescript
interface Transaction {
  _id: string;
  amount: string;
  savings: string;
  recipientAmount: string;
  xrpAmount: string;
  snapshot: {
    input: {
      usdAmount: number;
      recipientPhone: string;
      xrpRate: number;
      country: string;
      senderName: string;
      senderEmail: string;
      recipientName: string;
      addToVault: boolean;
    };
    calculation: {
      xrpAmount: number;
      fixedFeeUSD: number;
      westernUnionFee: number;
      savings: number;
      recipientAmount: number;
    };
    ledgerTime: string;
    fxSource: string;
  };
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
``` 