package com.scoreo.ui.util

fun requireNonBlank(value: String, label: String = "Name"): String? {
    val trimmed = value.trim()
    return if (trimmed.isBlank()) "$label cannot be empty" else null
}