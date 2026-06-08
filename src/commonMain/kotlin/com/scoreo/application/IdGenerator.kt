package com.scoreo.application

object IdGenerator {
    fun newId(): String {
        val hex = "0123456789abcdef"
        val chars = CharArray(36)
        for (i in 0..35) {
            when (i) {
                8, 13, 18, 23 -> chars[i] = '-'
                14 -> chars[i] = '4'
                19 -> chars[i] = hex[(0x8..0xb).random()]
                else -> chars[i] = hex[(0..15).random()]
            }
        }
        return chars.concatToString()
    }
}
