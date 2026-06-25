package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import com.scoreo.ui.Strings
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun ListItemRow(
    label: String,
    subtitle: String? = null,
    isSelectable: Boolean = false,   // affiche le picto ○/●
    isSelected: Boolean = false,     // ● si true, ○ si false
    onSelect: (() -> Unit)? = null,  // null = zone label passive (pas de cursor pointer)
    onView: (() -> Unit)? = null,    // null = bouton 👁 absent
    onEdit: (() -> Unit)? = null,    // null = bouton ✏ absent
    onDelete: (() -> Unit)? = null,  // null = bouton 🗑 absent
) {
    Div(attrs = { classes("list-item-row") }) {

        // ── Zone label (sélection) ──
        Div(attrs = {
            classes("list-item-label")
            if (onSelect != null) classes("list-item-label--selectable")
            if (isSelected) classes("list-item-label--selected")
            if (onSelect != null) onClick { onSelect() }
        }) {
            if (isSelectable) {
                Span(attrs = { classes("list-item-select-picto") }) {
                    Text(if (isSelected) "●" else "○")
                }
            }
            Div {
                Span(attrs = { classes("list-item-name") }) { Text(label) }
                if (subtitle != null) {
                    Span(attrs = { classes("list-item-subtitle") }) { Text(subtitle) }
                }
            }
        }

         // ── Boutons d'action ──
         Div(attrs = { classes("list-item-actions") }) {
             if (onView != null) {
                 Button(attrs = {
                     classes("btn-icon")
                     title(Strings.TITLE_VIEW_DETAIL)
                     onClick { e -> e.stopPropagation(); onView() }
                 }) { Text("👁") }
             }
             if (onEdit != null) {
                 Button(attrs = {
                     classes("btn-icon")
                     title(Strings.TITLE_EDIT)
                     onClick { e -> e.stopPropagation(); onEdit() }
                 }) { Text("✏") }
             }
             if (onDelete != null) {
                 Button(attrs = {
                     classes("btn-icon", "btn-icon--danger")
                     title(Strings.TITLE_DELETE)
                     onClick { e -> e.stopPropagation(); onDelete() }
                 }) { Text("🗑") }
             }
         }
    }
}
