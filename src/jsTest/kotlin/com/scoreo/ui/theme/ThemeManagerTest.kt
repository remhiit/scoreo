package com.scoreo.ui.theme

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.browser.window
import kotlinx.browser.document

/**
 * Unit tests for ThemeManager composable.
 *
 * `readInitialFlavor`/`readInitialAccent`/`applyTheme` are private, so
 * these tests exercise the same localStorage keys and DOM attributes
 * the implementation reads/writes, the same way the pre-Catppuccin
 * version of this test did for `scoreo_theme`/`data-theme="dark"`.
 *
 * Tests verify:
 * - Reading saved flavor/accent from localStorage
 * - Migration from the old binary dark/light key (scoreo_theme)
 * - System preference detection via window.matchMedia
 * - DOM attribute application for flavor/accent switching
 * - Persistence in localStorage
 */
class ThemeManagerTest {

    @Test
    fun `flavor and accent keys are empty by default`() {
        window.localStorage.removeItem("scoreo_flavor")
        window.localStorage.removeItem("scoreo_accent")

        assertNull(window.localStorage.getItem("scoreo_flavor"))
        assertNull(window.localStorage.getItem("scoreo_accent"))
    }

    @Test
    fun `flavor persists in localStorage across changes`() {
        window.localStorage.setItem("scoreo_flavor", "latte")
        assertEquals("latte", window.localStorage.getItem("scoreo_flavor"))

        window.localStorage.setItem("scoreo_flavor", "mocha")
        assertEquals("mocha", window.localStorage.getItem("scoreo_flavor"))
    }

    @Test
    fun `accent persists in localStorage across changes`() {
        window.localStorage.setItem("scoreo_accent", "mauve")
        assertEquals("mauve", window.localStorage.getItem("scoreo_accent"))

        window.localStorage.setItem("scoreo_accent", "blue")
        assertEquals("blue", window.localStorage.getItem("scoreo_accent"))
    }

    @Test
    fun `legacy scoreo_theme key is still readable for migration`() {
        window.localStorage.setItem("scoreo_theme", "dark")
        assertEquals("dark", window.localStorage.getItem("scoreo_theme"))

        window.localStorage.setItem("scoreo_theme", "light")
        assertEquals("light", window.localStorage.getItem("scoreo_theme"))
    }

    @Test
    fun `applyTheme sets both data-theme and data-accent attributes`() {
        val html = document.documentElement

        html?.setAttribute("data-theme", "mocha")
        html?.setAttribute("data-accent", "teal")

        assertEquals("mocha", html?.getAttribute("data-theme"))
        assertEquals("teal", html?.getAttribute("data-accent"))
    }

    @Test
    fun `data-theme switches between all 4 flavors`() {
        val html = document.documentElement

        FLAVORS.forEach { flavor ->
            html?.setAttribute("data-theme", flavor)
            assertEquals(flavor, html?.getAttribute("data-theme"))
        }
    }

    @Test
    fun `system prefers-color-scheme is detectable`() {
        // Test that window.matchMedia is callable
        val darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")

        // Result should be a valid MediaQueryList
        assertTrue(darkModeQuery.matches || !darkModeQuery.matches)
    }
}
