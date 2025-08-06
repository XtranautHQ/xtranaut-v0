import { IRemittanceTransaction } from '@/lib/models/RemittanceTransaction';

export interface NotificationResult {
  success: boolean;
  method: 'email' | 'sms' | 'both';
  error?: string;
  details?: any;
}

export interface EmailNotification {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SMSNotification {
  to: string;
  message: string;
}

export class NotificationService {
  
  /**
   * Send success notification to sender
   */
  async sendSuccessNotification(transaction: IRemittanceTransaction): Promise<NotificationResult> {
    try {
      const emailResult = await this.sendSuccessEmail(transaction);
      
      return {
        success: emailResult.success,
        method: 'email',
        error: emailResult.error,
        details: emailResult.details
      };
      
    } catch (error) {
      console.error('Error sending success notification:', error);
      return {
        success: false,
        method: 'email',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Send failure notification to sender
   */
  async sendFailureNotification(
    transaction: IRemittanceTransaction, 
    failureReason: string
  ): Promise<NotificationResult> {
    try {
      const emailResult = await this.sendFailureEmail(transaction, failureReason);
      
      return {
        success: emailResult.success,
        method: 'email',
        error: emailResult.error,
        details: emailResult.details
      };
      
    } catch (error) {
      console.error('Error sending failure notification:', error);
      return {
        success: false,
        method: 'email',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Send processing update notification
   */
  async sendProcessingUpdateNotification(
    transaction: IRemittanceTransaction,
    stage: string,
    status: string
  ): Promise<NotificationResult> {
    try {
      const emailResult = await this.sendProcessingUpdateEmail(transaction, stage, status);
      
      return {
        success: emailResult.success,
        method: 'email',
        error: emailResult.error
      };
      
    } catch (error) {
      console.error('Error sending processing update:', error);
      return {
        success: false,
        method: 'email',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Send success email
   */
  private async sendSuccessEmail(transaction: IRemittanceTransaction): Promise<NotificationResult> {
    const email: EmailNotification = {
      to: transaction.senderEmail,
      subject: `✅ Money Transfer Successful - ${transaction._id}`,
      htmlContent: this.generateSuccessEmailHTML(transaction),
      textContent: this.generateSuccessEmailText(transaction)
    };
    
    return await this.simulateEmailSend(email);
  }
  
  /**
   * Send failure email
   */
  private async sendFailureEmail(
    transaction: IRemittanceTransaction, 
    failureReason: string
  ): Promise<NotificationResult> {
    const email: EmailNotification = {
      to: transaction.senderEmail,
      subject: `❌ Money Transfer Failed - ${transaction._id}`,
      htmlContent: this.generateFailureEmailHTML(transaction, failureReason),
      textContent: this.generateFailureEmailText(transaction, failureReason)
    };
    
    return await this.simulateEmailSend(email);
  }
  
  /**
   * Send processing update email
   */
  private async sendProcessingUpdateEmail(
    transaction: IRemittanceTransaction,
    stage: string,
    status: string
  ): Promise<NotificationResult> {
    const email: EmailNotification = {
      to: transaction.senderEmail,
      subject: `📊 Transfer Update - ${transaction._id}`,
      htmlContent: this.generateUpdateEmailHTML(transaction, stage, status),
      textContent: this.generateUpdateEmailText(transaction, stage, status)
    };
    
    return await this.simulateEmailSend(email);
  }
  
  /**
   * Simulate email sending for MVP
   */
  private async simulateEmailSend(email: EmailNotification): Promise<NotificationResult> {
    // Simulate email service delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 95% success rate
    if (Math.random() > 0.05) {
      console.log(`✉️ Email sent to ${email.to}: ${email.subject}`);
      return {
        success: true,
        method: 'email',
        details: {
          messageId: 'MSG_' + Math.random().toString(36).substring(2, 15),
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        method: 'email',
        error: 'Email service temporarily unavailable'
      };
    }
  }
  
  /**
   * Generate success email HTML
   */
  private generateSuccessEmailHTML(transaction: IRemittanceTransaction): string {
    const completedAt = transaction.completedAt || new Date();
    const mpesaCode = transaction.stages.mpesaPayment.mpesaCode || 'N/A';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transfer Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .success { color: #10B981; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Transfer Successful!</h1>
          </div>
          <div class="content">
            <p>Dear ${transaction.senderName},</p>
            <p>Your money transfer has been <span class="success">successfully completed</span>!</p>
            
            <div class="details">
              <h3>Transaction Details</h3>
              <p><strong>Transaction ID:</strong> ${transaction._id}</p>
              <p><strong>Recipient:</strong> ${transaction.recipientName}</p>
              <p><strong>Phone:</strong> ${transaction.recipientPhone}</p>
              <p><strong>Amount Sent:</strong> $${transaction.usdAmount.toFixed(2)} USD</p>
              <p><strong>Amount Received:</strong> KES ${transaction.kesAmount.toFixed(2)}</p>
              <p><strong>M-Pesa Code:</strong> ${mpesaCode}</p>
              <p><strong>Completed:</strong> ${completedAt.toLocaleString()}</p>
            </div>
            
            <p>The recipient can use the M-Pesa code <strong>${mpesaCode}</strong> as reference for their transaction.</p>
            
            <p>Thank you for using our service!</p>
          </div>
          <div class="footer">
            <p>XRP Remittance Service</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Generate success email text
   */
  private generateSuccessEmailText(transaction: IRemittanceTransaction): string {
    const completedAt = transaction.completedAt || new Date();
    const mpesaCode = transaction.stages.mpesaPayment.mpesaCode || 'N/A';
    
    return `
Transfer Successful!

Dear ${transaction.senderName},

Your money transfer has been successfully completed!

Transaction Details:
- Transaction ID: ${transaction._id}
- Recipient: ${transaction.recipientName}
- Phone: ${transaction.recipientPhone}
- Amount Sent: $${transaction.usdAmount.toFixed(2)} USD
- Amount Received: KES ${transaction.kesAmount.toFixed(2)}
- M-Pesa Code: ${mpesaCode}
- Completed: ${completedAt.toLocaleString()}

The recipient can use the M-Pesa code ${mpesaCode} as reference.

Thank you for using our service!

XRP Remittance Service
    `;
  }
  
  /**
   * Generate failure email HTML
   */
  private generateFailureEmailHTML(transaction: IRemittanceTransaction, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transfer Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .error { color: #EF4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Transfer Failed</h1>
          </div>
          <div class="content">
            <p>Dear ${transaction.senderName},</p>
            <p>Unfortunately, your money transfer could not be completed.</p>
            
            <div class="details">
              <h3>Transaction Details</h3>
              <p><strong>Transaction ID:</strong> ${transaction._id}</p>
              <p><strong>Recipient:</strong> ${transaction.recipientName}</p>
              <p><strong>Amount:</strong> $${transaction.usdAmount.toFixed(2)} USD</p>
              <p><strong>Reason:</strong> <span class="error">${reason}</span></p>
            </div>
            
            <p>Your funds have not been deducted. Please try again or contact support if the issue persists.</p>
          </div>
          <div class="footer">
            <p>XRP Remittance Service</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Generate failure email text
   */
  private generateFailureEmailText(transaction: IRemittanceTransaction, reason: string): string {
    return `
Transfer Failed

Dear ${transaction.senderName},

Unfortunately, your money transfer could not be completed.

Transaction Details:
- Transaction ID: ${transaction._id}
- Recipient: ${transaction.recipientName}
- Amount: $${transaction.usdAmount.toFixed(2)} USD
- Reason: ${reason}

Your funds have not been deducted. Please try again or contact support if the issue persists.

XRP Remittance Service
    `;
  }
  
  /**
   * Generate update email HTML
   */
  private generateUpdateEmailHTML(transaction: IRemittanceTransaction, stage: string, status: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transfer Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Transfer Update</h1>
          </div>
          <div class="content">
            <p>Dear ${transaction.senderName},</p>
            <p>Here's an update on your transfer:</p>
            
            <div class="details">
              <h3>Current Status</h3>
              <p><strong>Transaction ID:</strong> ${transaction._id}</p>
              <p><strong>Stage:</strong> ${stage}</p>
              <p><strong>Status:</strong> ${status}</p>
              <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>We'll notify you once the transfer is complete.</p>
          </div>
          <div class="footer">
            <p>XRP Remittance Service</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Generate update email text
   */
  private generateUpdateEmailText(transaction: IRemittanceTransaction, stage: string, status: string): string {
    return `
Transfer Update

Dear ${transaction.senderName},

Here's an update on your transfer:

Transaction ID: ${transaction._id}
Stage: ${stage}
Status: ${status}
Updated: ${new Date().toLocaleString()}

We'll notify you once the transfer is complete.

XRP Remittance Service
    `;
  }
}

// Singleton instance
export const notificationService = new NotificationService();