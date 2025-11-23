package com.transactai

import com.transactai.models.CategorizationRequest
import com.transactai.models.CategorizationResponse
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

interface CategorizationApi {
    @POST("classify") // Corrected endpoint path
    suspend fun categorizeTransaction(
        @Body request: CategorizationRequest
    ): Response<CategorizationResponse>
}

/**
 * API Client for backend communication
 *
 * Configuration:
 * - Replace BASE_URL with your actual backend IP/domain
 * - Timeout: 30 seconds for API calls
 * - Logging enabled for debugging
 */
object ApiClient {
    // TODO: Replace with your actual backend IP address
    private const val BASE_URL = "http://10.254.244.112:8000/api/" // Using the IP from the deleted class

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val api: CategorizationApi = retrofit.create(CategorizationApi::class.java)

    /**
     * Categorize transaction text using backend API
     *
     * @param text Transaction notification text
     * @return CategorizationResponse with category and confidence, or null on failure
     */
    suspend fun categorizeTransaction(text: String): CategorizationResponse? {
        return try {
            val response = api.categorizeTransaction(CategorizationRequest(text))
            if (response.isSuccessful) {
                response.body()
            } else {
                android.util.Log.e("ApiClient", "API Error: ${response.code()} - ${response.message()}")
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiClient", "Network Error: ${e.message}", e)
            null
        }
    }
}
