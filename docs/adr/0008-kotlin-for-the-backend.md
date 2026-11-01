# 8. Kotlin for the backend

**Status:** Accepted. Replaces the original plan of a Java backend.

## Context
The backend skeleton was generated in Java 25. Vestra is also a learning project, and the backend is where I want to get hands-on practice with Kotlin. Spring Boot supports Kotlin as a first-class language: there are Gradle plugins for Spring's proxying and JPA's no-arg constructors, Jackson has a Kotlin module, and the reference docs include Kotlin examples. Kotlin compiles to the same JVM bytecode, so the runtime, Docker image and hosting ([ADR 0007](0007-hosting-vercel-render-neon.md)) stay the same.

## Decision
- **New backend code is written in Kotlin** under `backend/src/main/kotlin` and `backend/src/test/kotlin`, in the same `no.vestra` packages and module layout ([ADR 0001](0001-modular-monolith.md)).
- **The existing Java code stays** (`VestraApplication`, `StatusController` and the test setup) until it's ported. Java and Kotlin compile together in one Gradle build.
- **JVM 25 stays as the toolchain and runtime.**
- The build uses the Kotlin JVM plugin, plus:
  - `kotlin("plugin.spring")`: Kotlin classes are `final` by default, and this opens the classes Spring needs to proxy (`@Configuration`, `@Transactional`, and so on).
  - `kotlin("plugin.jpa")`: generates the no-arg constructors JPA needs for entities.
  - `jackson-module-kotlin`: lets Jackson handle Kotlin data classes and default values.
- **The money rules are unchanged** ([ADR 0006](0006-ledger-and-locking.md)). Money is `BigDecimal`, never `Double` or `Float`.

## Consequences
- While the port is in progress, the backend has two source trees. Spring component scanning works on packages, not folders, so it finds code in both.
- Kotlin's null safety has to be squared with JPA entities, which Hibernate fills in through reflection. Entity fields need deliberate choices: nullable types, `lateinit`, or IDs that are nullable until the entity is saved.
- Dockerfile and CI don't change. The Gradle build compiles Kotlin with the same JDK 25.
- Build times go up slightly because of the Kotlin compiler.
