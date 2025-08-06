import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPartnerWallet extends Document {
  address: string;
  country: string;
  currency: string;
  isActive: boolean;
  balance?: number;
  lastBalanceUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerWalletSchema = new Schema<IPartnerWallet>({
  address: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^r[a-zA-Z0-9]{24,34}$/, 'Invalid XRP wallet address format']
  },
  country: {
    type: String,
    required: true,
    enum: ['Kenya', 'Uganda', 'Tanzania', 'Rwanda']
  },
  currency: {
    type: String,
    required: true,
    enum: ['KES', 'UGX', 'TZS', 'RWF']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  balance: {
    type: Number,
    min: 0,
    default: 0
  },
  lastBalanceUpdate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'partner_wallets'
});

// Indexes
PartnerWalletSchema.index({ country: 1, isActive: 1 });
PartnerWalletSchema.index({ address: 1 });

// Static methods
PartnerWalletSchema.statics.findByCountry = function(country: string) {
  return this.findOne({ 
    country, 
    isActive: true 
  });
};

PartnerWalletSchema.statics.getActiveWallets = function() {
  return this.find({ isActive: true }).sort({ country: 1 });
};

// Instance methods
PartnerWalletSchema.methods.updateBalance = function(newBalance: number) {
  this.balance = newBalance;
  this.lastBalanceUpdate = new Date();
  return this.save();
};

// Create and export the model
let PartnerWallet: Model<IPartnerWallet>;

try {
  PartnerWallet = mongoose.model<IPartnerWallet>('PartnerWallet');
} catch {
  PartnerWallet = mongoose.model<IPartnerWallet>('PartnerWallet', PartnerWalletSchema);
}

export default PartnerWallet;