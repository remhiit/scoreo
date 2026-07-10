package com.scoreo.ui.shared

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Table
import org.jetbrains.compose.web.dom.Tbody
import org.jetbrains.compose.web.dom.Td
import org.jetbrains.compose.web.dom.Text
import org.jetbrains.compose.web.dom.Tfoot
import org.jetbrains.compose.web.dom.Th
import org.jetbrains.compose.web.dom.Thead
import org.jetbrains.compose.web.dom.Tr

data class LudoColumn<T>(
    val header: String,
    val align: String? = null,
    val render: @Composable (T) -> Unit,
)

/**
 * Scoreboard grid: one column per player, one row per round, a
 * pinned totals row. Also works as a plain list table. Ported from
 * the Ludo design system's `Table` component.
 */
@Composable
fun <T> LudoTable(
    columns: List<LudoColumn<T>>,
    rows: List<T>,
    footer: (@Composable () -> Unit)? = null,
    striped: Boolean = true,
    dense: Boolean = false,
) {
    Table(attrs = {
        classes("ludo-table")
        if (striped) classes("ludo-table--striped")
        if (dense) classes("ludo-table--dense")
        if (footer == null) classes("ludo-table--no-footer")
    }) {
        Thead {
            Tr {
                columns.forEach { col ->
                    Th(attrs = { col.align?.let { style { property("text-align", it) } } }) {
                        Text(col.header)
                    }
                }
            }
        }
        Tbody {
            rows.forEach { row ->
                Tr {
                    columns.forEach { col ->
                        Td(attrs = { col.align?.let { style { property("text-align", it) } } }) {
                            col.render(row)
                        }
                    }
                }
            }
        }
        if (footer != null) {
            Tfoot {
                Tr { footer() }
            }
        }
    }
}
