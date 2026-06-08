package com.scoreo.application

object IdGenerator {
    fun newId(): String =
        (1..12).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")
}
