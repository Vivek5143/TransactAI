package com.transactai

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusTextView: TextView
    private lateinit var enableButton: Button
    private lateinit var debugTextView: TextView

    companion object {
        private const val TAG = "MainActivity"
        private const val NOTIFICATION_ACCESS_REQUEST = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initializeViews()
        setupClickListeners()

        checkAndRequestNotificationPermission()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == NOTIFICATION_ACCESS_REQUEST) {
            updateStatus()
        }
    }

    private fun initializeViews() {
        statusTextView = findViewById(R.id.statusTextView)
        enableButton = findViewById(R.id.enableButton)
        debugTextView = findViewById(R.id.debugTextView)
    }

    private fun setupClickListeners() {
        enableButton.setOnClickListener {
            openNotificationSettings()
        }
    }

    /**
     * Check if notification listener permission is granted
     */
    private fun isNotificationAccessGranted(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        )

        val packageName = packageName
        val isGranted = enabledListeners?.contains(packageName) ?: false

        Log.d(TAG, "🔐 Notification access granted: $isGranted")
        return isGranted
    }

    /**
     * Check and request notification permission
     */
    private fun checkAndRequestNotificationPermission() {
        if (!isNotificationAccessGranted()) {
            showNotificationPermissionDialog()
        } else {
            Log.d(TAG, "✅ Notification service is enabled")
            startNotificationService()
        }
    }

    /**
     * Show dialog to guide user to enable notification access
     */
    private fun showNotificationPermissionDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Notification Access Required")
            .setMessage("This app needs notification access to detect transaction messages from UPI apps like PhonePe, GPay, WhatsApp, etc.\n\nPlease enable it in the next screen.")
            .setPositiveButton("Enable") { _, _ ->
                openNotificationSettings()
            }
            .setNegativeButton("Cancel") { _, _ ->
                updateStatus()
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Open notification listener settings
     */
    private fun openNotificationSettings() {
        try {
            Log.d(TAG, "📱 Opening notification settings...")
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivityForResult(intent, NOTIFICATION_ACCESS_REQUEST)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to open notification settings: ${e.message}")
            // Fallback to general settings
            val intent = Intent(Settings.ACTION_SETTINGS)
            startActivity(intent)
        }
    }

    /**
     * Update UI based on permission status
     */
    private fun updateStatus() {
        if (isNotificationAccessGranted()) {
            statusTextView.text = "✅ Notification Access Enabled\n\nTransactionNotifier is actively monitoring banking and payment notifications.\n\nSend a UPI payment to test transaction detection."
            enableButton.text = "Settings"

            // Start service when permission is granted
            startNotificationService()
        } else {
            statusTextView.text = "🔔 Notification Access Required\n\nTo monitor transactions:\n1. Click 'Enable Notification Access'\n2. Find 'TransactAI' in the list\n3. Toggle the switch ON\n4. Return to this app"
            enableButton.text = "Enable Notification Access"
        }

        updateDebugInfo()
    }

    /**
     * Start the notification service
     */
    private fun startNotificationService() {
        try {
            val intent = Intent(this, NotificationService::class.java)
            ContextCompat.startForegroundService(this, intent)
            Log.d(TAG, "🚀 Notification service started")
            addDebugLog("🚀 Notification service started")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start service: ${e.message}")
            addDebugLog("❌ Failed to start service: ${e.message}")
        }
    }

    /**
     * Add debug log to UI
     */
    private fun addDebugLog(message: String) {
        runOnUiThread {
            val currentText = debugTextView.text.toString()
            val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
            val newText = if (currentText.isEmpty()) {
                "$timestamp: $message"
            } else {
                "$currentText\n$timestamp: $message"
            }
            debugTextView.text = newText
        }
    }

    private fun updateDebugInfo() {
        val debugInfo = """
            📱 Package: $packageName
            🔐 Notification Access: ${if (isNotificationAccessGranted()) "✅ Enabled" else "❌ Disabled"}
            🚀 Service: ${if (isNotificationAccessGranted()) "Active" else "Inactive"}
            ⏰ Last check: ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}
        """.trimIndent()

        debugTextView.text = debugInfo
    }
}