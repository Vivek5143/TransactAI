# TransactionNotifier - Android App

An Android application that automatically listens to transaction notifications from banking and UPI apps, sends them to an AI backend for categorization, and stores the results locally.

## Features

- 🔔 Automatic notification monitoring for banking/UPI apps
- 🏦 Support for major Indian banks and UPI apps (PhonePe, GPay, Paytm, etc.)
- 🤖 AI-powered transaction categorization
- 💾 Local transaction storage
- 🔒 Secure permission handling
- 📱 User-friendly setup flow

## Technical Stack

- **Language**: Kotlin
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Architecture**: Service-based with Coroutines
- **Networking**: Retrofit2 + OkHttp3
- **Database**: Room (for Phase 2)

## Project Structure

```
TransactionNotifier/
├── app/
│   ├── src/main/
│   │   ├── java/com/transactai/
│   │   │   ├── MainActivity.kt           # Permission management UI
│   │   │   ├── NotificationService.kt    # Notification listener
│   │   │   ├── ApiClient.kt              # Backend API client
│   │   │   └── models/
│   │   │       └── TransactionModels.kt  # Data models
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml     # Main UI layout
│   │   │   ├── values/
│   │   │   │   ├── strings.xml
│   │   │   │   ├── colors.xml
│   │   │   │   └── themes.xml
│   │   │   └── xml/
│   │   │       ├── backup_rules.xml
│   │   │       └── data_extraction_rules.xml
│   │   └── AndroidManifest.xml           # App configuration
│   ├── build.gradle                      # App dependencies
│   └── proguard-rules.pro               # ProGuard config
├── build.gradle                          # Project config
├── settings.gradle                       # Module config
└── gradle.properties                     # Gradle settings
```

## Setup Instructions

### 1. Configure Backend URL

Open `app/src/main/java/com/transactai/ApiClient.kt` and update the `BASE_URL`:

```kotlin
private const val BASE_URL = "http://YOUR_BACKEND_IP:8000/"
```

Replace `YOUR_BACKEND_IP` with your actual backend server IP address.

### 2. Build the Project

Open the project in Android Studio and sync Gradle:

```bash
# Or build from command line
./gradlew build
```

### 3. Run on Device/Emulator

1. Connect an Android device or start an emulator
2. Run the app from Android Studio
3. Grant notification access permission when prompted

### 4. Enable Notification Access

1. Open the app
2. Tap "Enable Notification Access"
3. Find "TransactionNotifier" in the list
4. Toggle the switch to enable
5. Return to the app

## Supported Banking Apps

### UPI Apps
- PhonePe
- Google Pay
- Paytm
- BHIM
- Amazon Pay

### Bank Apps
- SBI (State Bank of India)
- HDFC Bank
- ICICI Bank
- Axis Bank
- Kotak Mahindra Bank
- IndusInd Bank
- IDBI Bank
- YES Bank
- RBL Bank
- Standard Chartered
- Citibank
- And more...

## API Integration

### Backend Endpoint

**POST** `/api/categorize`

**Request:**
```json
{
  "text": "Debited Rs 500 from A/C for UPI payment to Starbucks"
}
```

**Response:**
```json
{
  "category": "Food",
  "confidence": 0.95
}
```

## Permissions Required

- `INTERNET` - For API calls
- `POST_NOTIFICATIONS` - For notification access
- `ACCESS_NOTIFICATION_POLICY` - For notification management
- `READ_POST_NOTIFICATIONS` - For Android 13+ notification reading
- `BIND_NOTIFICATION_LISTENER_SERVICE` - For service binding

## Transaction Detection

The app detects transactions using:

1. **Package Name Filtering**: Only monitors configured banking apps
2. **Keyword Matching**: Searches for transaction-related keywords:
   - debited, credited, payment, UPI
   - ₹, Rs., INR
   - transaction, paid, received, sent
   - withdraw, deposit, transfer
   - balance, spent, refund

## Debugging

View logs in Android Studio Logcat:

```
Filter: NotificationService
Tag: NotificationService
```

Key log messages:
- "Notification Listener Connected" - Service started
- "Transaction detected from..." - Transaction captured
- "Categorization result..." - API response received

## Security Considerations

- Uses `usesCleartextTraffic="true"` for local development (HTTP)
- For production, use HTTPS and remove cleartext traffic flag
- Sensitive data excluded from backups
- Network timeout: 30 seconds

## Phase 2 Enhancements (Future)

- [ ] Room database integration for local storage
- [ ] Transaction history UI
- [ ] Category statistics and analytics
- [ ] Manual transaction editing
- [ ] Export transactions to CSV/JSON
- [ ] Background sync optimization
- [ ] Battery optimization handling
- [ ] Custom banking app configuration

## Troubleshooting

### Notifications Not Being Captured

1. Verify notification access is enabled in Settings
2. Check if banking app is in the supported list
3. Ensure transaction keywords are present in notification
4. Review Logcat for service connection status

### API Calls Failing

1. Verify backend is running and accessible
2. Check BASE_URL configuration
3. Ensure device/emulator can reach backend IP
4. Review network logs in Logcat

### Service Not Starting

1. Force stop and restart the app
2. Revoke and re-grant notification access
3. Check Android system notification listener settings

## License

Copyright © 2024 TransactAI. All rights reserved.

## Support

For issues or questions, please check the logs and ensure all setup steps are completed correctly.
