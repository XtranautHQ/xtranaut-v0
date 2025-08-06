import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExchangeRate extends Document {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
  isActive: boolean;
}

const ExchangeRateSchema = new Schema<IExchangeRate>({
  from: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['XRP', 'USD', 'KES', 'UGX', 'TZS', 'RWF']
  },
  to: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['XRP', 'USD', 'KES', 'UGX', 'TZS', 'RWF']
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'exchange_rates'
});

// Compound index for currency pair and timestamp
ExchangeRateSchema.index({ from: 1, to: 1, timestamp: -1 });
ExchangeRateSchema.index({ timestamp: -1 });
ExchangeRateSchema.index({ isActive: 1 });

// Static methods
ExchangeRateSchema.statics.getLatestRate = function(from: string, to: string) {
  return this.findOne({
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    isActive: true
  }).sort({ timestamp: -1 });
};

ExchangeRateSchema.statics.getRateHistory = function(
  from: string, 
  to: string, 
  hours: number = 24
) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    timestamp: { $gte: cutoffTime },
    isActive: true
  }).sort({ timestamp: -1 });
};

// Create and export the model
let ExchangeRate: Model<IExchangeRate>;

try {
  ExchangeRate = mongoose.model<IExchangeRate>('ExchangeRate');
} catch {
  ExchangeRate = mongoose.model<IExchangeRate>('ExchangeRate', ExchangeRateSchema);
}

export default ExchangeRate;