package com.scoreo.domain

sealed class DomainError(override val message: String) : Throwable(message) {
    class Validation(field: String, reason: String) :
        DomainError("$field: $reason")

    class NotFound(entity: String, id: String) :
        DomainError("$entity $id not found")
}
