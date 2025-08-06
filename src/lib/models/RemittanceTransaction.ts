import mongoose, { Schema, Document, Model } from 'mongoose';

// Define interfaces
export interface ITransactionStage {
  timestamp?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  xrpTxHash?: string;
  partnerWalletAddress?: string;
  kesAmount?: number;
  mpesaTransactionId?: string;
  mpesaCode?: string;
  method?: 'email' | 'sms' | 'both';
}

export interface ITransactionError {
  stage: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export interface IRemittanceTransaction extends Document {
  _id: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  usdAmount: number;
  xrpAmount: number;
  kesAmount: number;
  fees: {
    serviceFeeUSD: number;
    networkFeeXRP: number;
  };
  rates: {
    xrpToUsd: number;
    usdToKes: number;
  };
  stages: {
    initiated: ITransactionStage;
    xrpSend: ITransactionStage;
    kesConversion: ITransactionStage;
    mpesaPayment: ITransactionStage;
    notification: ITransactionStage;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errors: ITransactionError[];
  country: string;
  metadata?: any;
}

// Define schemas
const TransactionStageSchema = new Schema<ITransactionStage>({
  timestamp: { type: Date },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  xrpTxHash: { type: String },
  partnerWalletAddress: { type: String },
  kesAmount: { type: Number },
  mpesaTransactionId: { type: String },
  mpesaCode: { type: String },
  method: { 
    type: String, 
    enum: ['email', 'sms', 'both'],
    default: 'email'
  }
}, { _id: false });

const TransactionErrorSchema = new Schema<ITransactionError>({
  stage: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  details: { type: Schema.Types.Mixed }
}, { _id: false });

const RemittanceTransactionSchema = new Schema<IRemittanceTransaction>({
  _id: { 
    type: String, 
    required: true 
  },
  senderName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  senderEmail: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  recipientName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  recipientPhone: { 
    type: String, 
    required: true,
    trim: true,
    match: [/^(\+254|254|0)[7][0-9]{8}$/, 'Please enter a valid Kenyan phone number']
  },
  usdAmount: { 
    type: Number, 
    required: true,
    min: [1, 'Amount must be at least $1'],
    max: [10000, 'Amount cannot exceed $10,000']
  },
  xrpAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  kesAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  fees: {
    serviceFeeUSD: { 
      type: Number, 
      required: true,
      min: 0
    },
    networkFeeXRP: { 
      type: Number, 
      required: true,
      min: 0,
      default: 0.0002
    }
  },
  rates: {
    xrpToUsd: { 
      type: Number, 
      required: true,
      min: 0
    },
    usdToKes: { 
      type: Number, 
      required: true,
      min: 0
    }
  },
  stages: {
    initiated: { 
      type: TransactionStageSchema, 
      required: true,
      default: () => ({ status: 'completed', timestamp: new Date() })
    },
    xrpSend: { 
      type: TransactionStageSchema, 
      required: true,
      default: () => ({ status: 'pending' })
    },
    kesConversion: { 
      type: TransactionStageSchema, 
      required: true,
      default: () => ({ status: 'pending' })
    },
    mpesaPayment: { 
      type: TransactionStageSchema, 
      required: true,
      default: () => ({ status: 'pending' })
    },
    notification: { 
      type: TransactionStageSchema, 
      required: true,
      default: () => ({ status: 'pending', method: 'email' })
    }
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  },
  errors: [TransactionErrorSchema],
  country: { 
    type: String, 
    required: true,
    enum: ['Kenya', 'Uganda', 'Tanzania', 'Rwanda']
  },
  metadata: { 
    type: Schema.Types.Mixed 
  }
}, {
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
  },
  collection: 'transactions'
});

// Indexes for better query performance
RemittanceTransactionSchema.index({ senderEmail: 1, createdAt: -1 });
RemittanceTransactionSchema.index({ status: 1, createdAt: -1 });
RemittanceTransactionSchema.index({ recipientPhone: 1, 'stages.mpesaPayment.status': 1 });
RemittanceTransactionSchema.index({ createdAt: -1 });

// Virtual for transaction age
RemittanceTransactionSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Pre-save middleware to update the updatedAt field
RemittanceTransactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
RemittanceTransactionSchema.methods.updateStage = function(
  stage: keyof IRemittanceTransaction['stages'], 
  status: ITransactionStage['status'],
  additionalData?: Partial<ITransactionStage>
) {
  this.stages[stage].status = status;
  this.stages[stage].timestamp = new Date();
  
  if (additionalData) {
    Object.assign(this.stages[stage], additionalData);
  }
  
  this.updatedAt = new Date();
  return this.save();
};

RemittanceTransactionSchema.methods.addError = function(
  stage: string, 
  message: string, 
  details?: any
) {
  this.errors.push({
    stage,
    message,
    timestamp: new Date(),
    details
  });
  this.updatedAt = new Date();
  return this.save();
};

RemittanceTransactionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

RemittanceTransactionSchema.methods.fail = function(stage: string, reason: string) {
  this.status = 'failed';
  this.addError(stage, reason);
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
RemittanceTransactionSchema.statics.findBySender = function(senderEmail: string) {
  return this.find({ senderEmail }).sort({ createdAt: -1 });
};

RemittanceTransactionSchema.statics.findByPhoneAndStatus = function(
  recipientPhone: string, 
  mpesaStatus: string, 
  timeLimit: number = 30
) {
  const cutoffTime = new Date(Date.now() - timeLimit * 60 * 1000);
  return this.findOne({
    recipientPhone,
    'stages.mpesaPayment.status': mpesaStatus,
    createdAt: { $gte: cutoffTime }
  });
};

RemittanceTransactionSchema.statics.getPendingTransactions = function() {
  return this.find({ status: { $in: ['pending', 'processing'] } }).sort({ createdAt: 1 });
};

RemittanceTransactionSchema.statics.getTransactionStats = function(timeframe: Date) {
  return this.aggregate([
    { $match: { createdAt: { $gte: timeframe } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$usdAmount' }
      }
    }
  ]);
};

// Create and export the model
let RemittanceTransaction: Model<IRemittanceTransaction>;

try {
  // Try to get existing model
  RemittanceTransaction = mongoose.model<IRemittanceTransaction>('RemittanceTransaction');
} catch {
  // Create new model if it doesn't exist
  RemittanceTransaction = mongoose.model<IRemittanceTransaction>('RemittanceTransaction', RemittanceTransactionSchema);
}

export default RemittanceTransaction;