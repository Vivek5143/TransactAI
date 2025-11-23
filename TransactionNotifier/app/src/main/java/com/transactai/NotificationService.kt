package com.transactai

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Notification Listener Service for detecting transaction notifications
 *
 * Responsibilities:
 * 1. Listen to all notifications
 * 2. Filter transaction-related notifications
 * 3. Send transaction text to backend for categorization
 * 4. Store categorized transactions
 */
class NotificationService : NotificationListenerService() {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val transactionKeywords = listOf(
        "paid", "received", "sent", "transfer", "upi", "transaction",
        "debited", "credited", "payment", "purchase", "order",
        "rs.", "₹", "inr", "amount", "bank", "account"
    )

    companion object {
        private const val TAG = "NotificationService"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🟢 NotificationService created")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "🔗 Notification listener CONNECTED - Ready to receive notifications!")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.e(TAG, "🔴 Notification listener DISCONNECTED")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        val notificationText = extractNotificationText(sbn)

        // Log ALL notifications for debugging
        Log.d(TAG, "🔍 Notification from: $packageName")
        Log.d(TAG, "📝 Raw text: $notificationText")

        if (isTransactionNotification(packageName, notificationText)) {
            Log.d(TAG, "✅ Transaction detected: $notificationText")

            scope.launch {
                try {
                    Log.d(TAG, "🚀 Sending to categorization API...")
                    val result = ApiClient.categorizeTransaction(notificationText)

                    if (result != null) {
                        Log.d(TAG, "🎯 Categorized as: ${result.category} (confidence: ${result.confidence ?: "N/A"})")

                        // Store result
                        saveCategorizedTransaction(notificationText, result.category)
                    } else {
                        Log.e(TAG, "❌ API returned null response")
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "💥 Categorization failed: ${e.message}", e)
                }
            }
        } else {
            Log.d(TAG, "⏭️ Skipped non-transaction notification")
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Optional: Handle notification removal if needed
    }

    /**
     * Extract text from notification
     */
    private fun extractNotificationText(sbn: StatusBarNotification): String {
        return try {
            val extras = sbn.notification.extras
            val title = extras.getString("android.title") ?: ""
            val text = extras.getString("android.text") ?: ""
            val bigText = extras.getString("android.bigText") ?: ""

            // Combine all text fields
            val result = "$title $text $bigText".trim()

            Log.d(TAG, "📄 Extracted - Title: '$title', Text: '$text', BigText: '$bigText'")
            result

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error extracting notification text: ${e.message}")
            ""
        }
    }

    /**
     * Check if notification is transaction-related
     */
    private fun isTransactionNotification(packageName: String, text: String): Boolean {
        // Check common banking/payment apps
        val isPaymentApp = packageName.contains("payment", true) ||
                packageName.contains("bank", true) ||
                packageName.contains("upi", true) ||
                packageName.contains("wallet", true) ||
                packageName.contains("pay", true) ||
                packageName in listOf(
            "com.whatsapp",
            "com.phonepe.app",
            "com.google.android.apps.nbu.paisa.user",
            "in.org.npci.upiapp",
            "com.paytm",
            "com.amazon.in"
        )

        // Check for transaction keywords in text
        val hasTransactionKeywords = transactionKeywords.any { keyword ->
            text.contains(keyword, ignoreCase = true)
        }

        // Check for amount patterns (₹100, Rs.500, INR 200, etc.)
        val hasAmountPattern = text.contains(Regex("""(₹|rs\.?|inr)\s*\d+""", RegexOption.IGNORE_CASE))

        val isTransaction = (isPaymentApp && hasTransactionKeywords) || hasAmountPattern

        Log.d(TAG, "🔎 Transaction check - App: $isPaymentApp, Keywords: $hasTransactionKeywords, Amount: $hasAmountPattern → Result: $isTransaction")

        return isTransaction
    }

    /**
     * Save categorized transaction to local storage
     */
    private fun saveCategorizedTransaction(originalText: String, category: String) {
        try {
            // TODO: Implement local storage (Room Database, SharedPreferences, or File)
            Log.d(TAG, "💾 Saving transaction: '$originalText' → '$category'")

            // For now, just log it
            Log.i(TAG, "📊 TRANSACTION SAVED: $originalText → $category")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save transaction: ${e.message}")
        }
    }
}