package com.transactai.models

import com.google.gson.annotations.SerializedName

/**
 * Request model for categorization API
 */
data class CategorizationRequest(
    @SerializedName("text")
    val text: String
)

/**
 * Response model from categorization API
 */
data class CategorizationResponse(
    @SerializedName("category")
    val category: String,
    
    @SerializedName("confidence")
    val confidence: Double
)

/**
 * Transaction model for local storage
 */
data class Transaction(
    val id: Long = 0,
    val text: String,
    val category: String,
    val confidence: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val appPackage: String
)
