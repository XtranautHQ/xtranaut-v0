export interface TransactionData {
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
}

export interface Transaction extends TransactionData {
  _id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export class TransactionService {
  private static baseUrl = '/api/transactions';

  static async saveTransaction(transactionData: TransactionData): Promise<{ success: boolean; transactionId: string; message: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      return data;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  static async getTransactions(page: number = 1, limit: number = 10): Promise<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  static async getTransaction(id: string): Promise<{ transaction: Transaction }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transaction');
      }

      return data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  static async updateTransaction(id: string, updateData: Partial<Transaction>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }
} 