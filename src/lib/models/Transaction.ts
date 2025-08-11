import { Schema, model, models } from "mongoose";

export interface TransactionDocument {
  transactionId: string;
  idempotencyKey: string;
  sender: {
    name: string;
    email: string;
  };
  receiver: {
    name: string;
    phone: string;
    country: string;
  };
  amounts: {
    usd: number;
    xrp: number;
    local: number;
    localCurrency: string;
  };
  fees: {
    networkFee: number;
    totalFee: number;
    savings: number;
  };
  vault: {
    enabled: boolean;
    amount: number;
  };
  fxRate: {
    usdToXrp: number;
    usdToLocal: number;
    source: string;
    timestamp: Date;
    hash: string;
    feePercentage: number;
  };
  status: 'pending' | 'xrp_converting' | 'xrp_sent' | 'mpesa_processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  steps: {
    usdToXrp: { completed: boolean; timestamp?: Date; error?: string };
    xrpTransfer: { completed: boolean; timestamp?: Date; error?: string; hash?: string; ledgerIndex?: number };
    mpesaPayout: { completed: boolean; timestamp?: Date; error?: string; reference?: string };
  };
  xrplTransaction?: {
    hash: string;
    ledgerIndex: number;
    fee: number;
    amount: number;
  };
  mpesaTransaction?: {
    reference: string;
    status: string;
    amount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      unique: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required"],
      unique: true,
      index: true,
    },
    sender: {
      name: {
        type: String,
        required: [true, "Sender name is required"],
      },
      email: {
        type: String,
        required: [true, "Sender email is required"],
      },
    },
    receiver: {
      name: {
        type: String,
        required: [true, "Receiver name is required"],
      },
      phone: {
        type: String,
        required: [true, "Receiver phone is required"],
      },
      country: {
        type: String,
        required: [true, "Receiver country is required"],
      },
    },
    amounts: {
      usd: {
        type: Number,
        required: [true, "USD amount is required"],
      },
      xrp: {
        type: Number,
        required: [true, "XRP amount is required"],
      },
      local: {
        type: Number,
        required: [true, "Local amount is required"],
      },
      localCurrency: {
        type: String,
        required: [true, "Local currency is required"],
      },
    },
    fees: {
      networkFee: {
        type: Number,
        required: [true, "Network fee is required"],
      },
      totalFee: {
        type: Number,
        required: [true, "Total fee is required"],
      },
      savings: {
        type: Number,
        required: [true, "Savings amount is required"],
      },
    },
    vault: {
      enabled: {
        type: Boolean,
        default: false,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    fxRate: {
      usdToXrp: {
        type: Number,
        required: [true, "USD to XRP rate is required"],
      },
      usdToLocal: {
        type: Number,
        required: [true, "USD to local rate is required"],
      },
      source: {
        type: String,
        required: [true, "FX rate source is required"],
      },
      timestamp: {
        type: Date,
        required: [true, "FX rate timestamp is required"],
      },
      hash: {
        type: String,
        required: [true, "FX rate hash is required"],
      },
      feePercentage: {
        type: Number,
        required: [true, "FX fee percentage is required"],
        default: 1.0,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'xrp_converting', 'xrp_sent', 'mpesa_processing', 'completed', 'failed'],
      default: 'pending',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastRetryAt: {
      type: Date,
    },
    steps: {
      usdToXrp: {
        completed: { type: Boolean, default: false },
        timestamp: { type: Date },
        error: { type: String },
      },
      xrpTransfer: {
        completed: { type: Boolean, default: false },
        timestamp: { type: Date },
        error: { type: String },
        hash: { type: String },
        ledgerIndex: { type: Number },
      },
      mpesaPayout: {
        completed: { type: Boolean, default: false },
        timestamp: { type: Date },
        error: { type: String },
        reference: { type: String },
      },
    },
    xrplTransaction: {
      hash: { type: String },
      ledgerIndex: { type: Number },
      fee: { type: Number },
      amount: { type: Number },
    },
    mpesaTransaction: {
      reference: { type: String },
      status: { type: String },
      amount: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = models.Transaction || model<TransactionDocument>("Transaction", TransactionSchema);
export default Transaction;
