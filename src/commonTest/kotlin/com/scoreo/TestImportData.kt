package com.scoreo

object TestImportData {
    val validJson = """{
        "version": "1.1",
        "game": "TestGame",
        "winCondition": "HIGHEST_SCORE",
        "games": [
            {
                "id": "m1",
                "date": 1000000,
                "ranking": [
                    {"name": "Alice", "score": 10, "rank": 1},
                    {"name": "Bob", "score": 5, "rank": 2}
                ]
            }
        ]
    }"""

    val multiGameJson = """{
        "version": "1.1",
        "game": "TestGame",
        "games": [
            {
                "id": "m1",
                "date": 1000000,
                "ranking": [
                    {"name": "Alice", "score": 10, "rank": 1},
                    {"name": "Bob", "score": 5, "rank": 2}
                ]
            },
            {
                "id": "m2",
                "date": 2000000,
                "ranking": [
                    {"name": "Alice", "score": 8, "rank": 1},
                    {"name": "Bob", "score": 3, "rank": 2}
                ]
            }
        ]
    }"""

    val withDetailsJson = """{
        "version": "1.1",
        "game": "TestGame",
        "games": [
            {
                "id": "m1",
                "date": 1000000,
                "ranking": [
                    {"name": "Alice", "score": 13, "rank": 1},
                    {"name": "Bob", "score": 7, "rank": 2}
                ],
                "details": [
                    {"scores": [{"name": "Alice", "score": 10}, {"name": "Bob", "score": 5}]},
                    {"scores": [{"name": "Alice", "score": 3}, {"name": "Bob", "score": 2}]}
                ]
            }
        ]
    }"""

    val withMismatchedDetailsJson = """{
        "version": "1.1",
        "game": "TestGame",
        "games": [
            {
                "id": "m1",
                "date": 1000000,
                "ranking": [
                    {"name": "Alice", "score": 10, "rank": 1},
                    {"name": "Bob", "score": 5, "rank": 2}
                ],
                "details": [
                    {"scores": [{"name": "Alice", "score": 999}, {"name": "Bob", "score": 5}]}
                ]
            }
        ]
    }"""

    val withoutDateJson = """{
        "version": "1.1",
        "game": "TestGame",
        "games": [
            {
                "id": "m1",
                "ranking": [
                    {"name": "Alice", "score": 10, "rank": 1},
                    {"name": "Bob", "score": 5, "rank": 2}
                ]
            }
        ]
    }"""

    val invalidJson = "{not valid json}"

    val emptyGamesJson = """{
        "version": "1.1",
        "game": "TestGame",
        "games": []
    }"""
}
