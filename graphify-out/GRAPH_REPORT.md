# Graph Report - E-Ventanilla api & app  (2026-10-14)

## Corpus Check
- 166 files · ~81,004 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 963 nodes · 1815 edges · 87 communities (50 shown, 23 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 238 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Theme & Baseline
- Auth Form Validation
- Access Coordination & Auth Repo
- Catalog Screens & Data
- Recovery Flow & API Client
- API Package Metadata
- Deployment & CI Services
- API Core Modules
- API Runtime Dependencies
- Dev Tools Auth Lab
- Auth Controller Endpoints
- Auth Screens & State
- Mail & Appointment Services
- Public Catalog API
- Institutional Design System
- Catalog UI Tests
- Auth DTO Validation
- Recovery Screens & Form Fields
- API Auth Validation Utils
- Institutional UI Tests
- TypeScript Config
- Challenges & Crypto Security
- Sessions & Verification Receipts
- AuthService Flows
- Empty Auth Capture Tests
- DB Permissions Integration Tests
- DB Domain Integration Tests
- Auth Resources & Previews
- Verification Delivery (Android)
- Prisma DB Integration
- Local DB Startup Script
- Deployment Build Scripts
- Delivery Status & Verify Screen
- Catalog Status Controller
- Auth Validation Tests
- Postgres Roles Config
- Deployment Packaging Script
- DB Surnames Integration
- Institutional Brand Assets
- Header & Notification Icons
- Backup Restore Check
- Backup Run
- API Templates Test
- Auth Lab UI Tests
- Chiapas Shield Branding
- Auth Resource Import
- Deployment Prepare Script
- Form Field Factories
- Brand & Privacy QR
- Field Contract Tests
- Gradle Wrapper
- Auth Contract Test
- Restore Check Compose
- Prettier Config
- Inter Font License
- SecLists Licenses
- Profile Screen
- Brand Identity Concepts
- Public Catalog Test
- Verification Test
- Update Services Script
- Privacy QR Generation
- Stop Local DB Script
- Privacy QR Verification
- DB Initialization Test
- Nav Home Icon
- Nav Procedures Icon
- Nav Profile Icon
- Clean Dist Script
- Field Contract Test
- Private Services Check
- Deployment Logs
- Host Preparation

## God Nodes (most connected - your core abstractions)
1. `EVentanillaTheme()` - 44 edges
2. `AccessCoordinator` - 38 edges
3. `CatalogRepository` - 38 edges
4. `EVentanillaApp()` - 37 edges
5. `AuthField` - 35 edges
6. `AccessState` - 33 edges
7. `AuthResources` - 30 edges
8. `AuthRepository` - 28 edges
9. `AuthService` - 24 edges
10. `DatabaseService` - 19 edges

## Surprising Connections (you probably didn't know these)
- `CI Postgres 18-bookworm Service` --semantically_similar_to--> `Compose Service: database (postgres:18-bookworm)`  [INFERRED] [semantically similar]
  .github/workflows/checks.yml → deployment/compose.yaml
- `Instrumented Tests on Android Emulator (API 35)` --conceptually_related_to--> `Network: proxy_net (external)`  [AMBIGUOUS]
  .github/workflows/checks.yml → deployment/compose.yaml
- `Spiral-Diamond-Cross Central Motif (Chiapaneco Heart)` --semantically_similar_to--> `COESA Logo - Comisión Estatal de Simplificación Administrativa`  [INFERRED] [semantically similar]
  apps/android/app/src/main/res/drawable-nodpi/institutional_pattern.png → apps/android/app/src/main/res/drawable-nodpi/logo_coesa.png
- `AuthLab()` --calls--> `LoginScreen()`  [INFERRED]
  apps/android/app/src/debug/java/dev/daesrock/eventanilla/devtools/AuthLabActivity.kt → apps/android/app/src/main/java/dev/daesrock/eventanilla/feature/auth/presentation/LoginScreen.kt
- `AuthLab()` --calls--> `ForgotScreen()`  [INFERRED]
  apps/android/app/src/debug/java/dev/daesrock/eventanilla/devtools/AuthLabActivity.kt → apps/android/app/src/main/java/dev/daesrock/eventanilla/feature/auth/presentation/RecoveryScreens.kt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compose Deployment Lifecycle: database -> migrate -> api** — deployment_compose_yaml_database_service, deployment_compose_yaml_migrate_service, deployment_compose_yaml_api_service [EXTRACTED 1.00]
- **Encrypted Backup and Verified Restore Flow** — deployment_compose_yaml_backup_service, deployment_compose_yaml_restore_db_service, deployment_compose_yaml_restore_check_service, deployment_compose_yaml_rclone_config_secret, distribution_backup_crypt_rclone_rationale [EXTRACTED 1.00]
- **CI Isolated Postgres Testing Flow** — _github_workflows_checks_yml_api_and_database_job, _github_workflows_checks_yml_postgres_ci_service, _github_workflows_checks_yml_isolated_db_env_setup, _github_workflows_checks_yml_database_integration_tests [EXTRACTED 1.00]
- **Bottom Navigation Components** — apps_android_app_src_main_res_raw_nav_home_nav_home_icon, apps_android_app_src_main_res_raw_nav_notifications_nav_notifications_icon, apps_android_app_src_main_res_raw_nav_procedures_nav_procedures_icon, apps_android_app_src_main_res_raw_nav_profile_nav_profile_icon [INFERRED 0.85]

## Communities (87 total, 23 thin omitted)

### Community 0 - "App Theme & Baseline"
Cohesion: 0.09
Nodes (28): AccessFlowTest, Gateway, ApiGateway, JSONObject, MainScreensCapturesTest, ApiGateway, ApiGateway, ApiGateway (+20 more)

### Community 1 - "Auth Form Validation"
Cohesion: 0.06
Nodes (27): AuthInputPolicy, AuthField, CODE, CONFIRMATION, CURP, EMAIL, FIRST_NAME, IDENTIFIER (+19 more)

### Community 2 - "Access Coordination & Auth Repo"
Cohesion: 0.08
Nodes (16): Application, AccessCoordinator, ViewModel, AppContainer, applicationAccessCoordinator(), Factory, applicationCatalogRepository(), EVentanillaApplication (+8 more)

### Community 3 - "Catalog Screens & Data"
Cohesion: 0.07
Nodes (32): Modifier, ProfileGreeting(), SectionBanner(), SectionHeading(), WorkspaceCard(), AppointmentsScreen(), AppointmentSteps(), branchMapUrl() (+24 more)

### Community 4 - "Recovery Flow & API Client"
Cohesion: 0.12
Nodes (13): ApiGateway, JSONObject, PublicApiConnectionTest, Gateway, ApiGateway, JSONObject, RecoveryFlowTest, ApiClient (+5 more)

### Community 5 - "API Package Metadata"
Cohesion: 0.06
Nodes (34): devDependencies, prettier, prisma, @types/express, @types/node, @types/pg, typescript, engines (+26 more)

### Community 6 - "Deployment & CI Services"
Cohesion: 0.09
Nodes (32): Android Gradle Build (ktlint, unit test, lint, assemble), CI Job: android, CI Job: api-and-database, API format:check + test Suite, tests/api/templates.test.mjs, CI isolation: isolated fixtures, no secrets, no VPS publication, Instrumented Tests on Android Emulator (API 35), tests/database/initialization.sh (+24 more)

### Community 7 - "API Core Modules"
Cohesion: 0.13
Nodes (15): AppModule, Module, config, validateConfig(), environmentSecret(), DatabaseModule, Module, validationFailure() (+7 more)

### Community 8 - "API Runtime Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, class-transformer, class-validator, dotenv, helmet, @nestjs/common, @nestjs/core, @nestjs/platform-express (+19 more)

### Community 9 - "Dev Tools Auth Lab"
Cohesion: 0.09
Nodes (22): AuthLabActivity, Bundle, ComponentActivity, LabScreen, FORGOT, LOGIN, RECOVERY_CODE, REGISTER (+14 more)

### Community 10 - "Auth Controller Endpoints"
Cohesion: 0.18
Nodes (8): AuthController, bearer(), Controller, Get, Body, Headers, Post, Throttle

### Community 11 - "Auth Screens & State"
Cohesion: 0.19
Nodes (9): AuthScreensTest, LoginTemplate(), VerificationTemplate(), AccessState, RegistrationRequest, AccountLink(), LoginScreen(), RegisterScreen() (+1 more)

### Community 12 - "Mail & Appointment Services"
Cohesion: 0.10
Nodes (10): DatabaseService, Injectable, decryptCode(), AppointmentRepository, ReservationInput, Injectable, MailService, Injectable (+2 more)

### Community 13 - "Public Catalog API"
Cohesion: 0.14
Nodes (11): normalizeMunicipality(), PublicCatalogController, Controller, Get, branchSelect, procedureSelect, PublicCatalogService, search() (+3 more)

### Community 14 - "Institutional Design System"
Cohesion: 0.18
Nodes (15): MainDestination, ContactText(), FooterMarks(), InstitutionalFooter(), Modifier, InstitutionalHeader(), BrandLogo(), DestinationIcon() (+7 more)

### Community 15 - "Catalog UI Tests"
Cohesion: 0.27
Nodes (6): CatalogScreensTest, UriHandler, Gateway, ApiGateway, JSONObject, UriHandler

### Community 16 - "Auth DTO Validation"
Cohesion: 0.23
Nodes (16): IdentifierDto, LoginDto, RegisterDto, ResetCodeDto, ResetDto, VerifyDto, NewPassword(), IsBoolean (+8 more)

### Community 17 - "Recovery Screens & Form Fields"
Cohesion: 0.20
Nodes (11): Fields, Form(), Input(), Submit(), Municipality, MunicipalityField(), ForgotScreen(), RecoveryCodeScreen() (+3 more)

### Community 18 - "API Auth Validation Utils"
Cohesion: 0.21
Nodes (12): fieldFailure(), messages, blocked, metadata, passwordError(), requireNewPassword(), source, registrationSurnames() (+4 more)

### Community 19 - "Institutional UI Tests"
Cohesion: 0.21
Nodes (6): InstitutionalUiTest, ApiGateway, UriHandler, ApiGateway, JSONObject, UriHandler

### Community 20 - "TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, moduleResolution, noUncheckedIndexedAccess, outDir (+7 more)

### Community 21 - "Challenges & Crypto Security"
Cohesion: 0.30
Nodes (9): codeDigest(), createCode(), derive(), encryptCode(), equalDigest(), hashPassword(), scryptOptions, verifyPassword() (+1 more)

### Community 22 - "Sessions & Verification Receipts"
Cohesion: 0.24
Nodes (7): createToken(), tokenDigest(), publicUser(), createVerificationReceipt(), key(), readVerificationReceipt(), SessionService

### Community 24 - "Empty Auth Capture Tests"
Cohesion: 0.29
Nodes (4): EmptyAuthCapturesTest, ApiGateway, ApiGateway, JSONObject

### Community 25 - "DB Permissions Integration Tests"
Cohesion: 0.14
Nodes (10): admin, checks, { Client }, clients, db, names, original, password (+2 more)

### Community 26 - "DB Domain Integration Tests"
Cohesion: 0.15
Nodes (8): admin, { Client }, db, original, report, require, root, variables

### Community 27 - "Auth Resources & Previews"
Cohesion: 0.21
Nodes (8): RecoveryCodeTemplate(), RecoveryTemplate(), RegistrationTemplate(), ResetTemplate(), AuthResources, Municipality, ByteArray, Context

### Community 28 - "Verification Delivery (Android)"
Cohesion: 0.23
Nodes (3): JSONObject, VerificationDelivery, VerificationDeliveryTest

### Community 29 - "Prisma DB Integration"
Cohesion: 0.17
Nodes (10): ../../apps/api/dist/core/configuration/config.js, ../../apps/api/dist/core/security/crypto.js, ../../apps/api/dist/features/appointments/appointment.repository.js, ../../apps/api/dist/features/auth/auth.service.js, ../../apps/api/dist/generated/prisma/client.js, admin, { Client }, original (+2 more)

### Community 30 - "Local DB Startup Script"
Cohesion: 0.20
Nodes (10): { Client }, dir, exe(), passwordFile, probe, require, root, run() (+2 more)

### Community 31 - "Deployment Build Scripts"
Cohesion: 0.20
Nodes (6): db, result, catalog, database, base, local

### Community 32 - "Delivery Status & Verify Screen"
Cohesion: 0.22
Nodes (7): DeliveryStatus, ACCEPTED, EXPIRED, FAILED, NOT_REQUESTED, PENDING, VERIFIED

### Community 33 - "Catalog Status Controller"
Cohesion: 0.36
Nodes (3): StatusController, Controller, Get

### Community 35 - "Postgres Roles Config"
Cohesion: 0.29
Nodes (6): EV_API_PASSWORD, EV_BACKUP_PASSWORD, EV_MANAGER_PASSWORD, EV_MIGRATION_PASSWORD, PGPASSWORD, 01-roles.sh script

### Community 36 - "Deployment Packaging Script"
Cohesion: 0.29
Nodes (5): archive, commit, metadata, output, root

### Community 37 - "DB Surnames Integration"
Cohesion: 0.29
Nodes (6): admin, { Client }, db, directory, original, root

### Community 38 - "Institutional Brand Assets"
Cohesion: 0.33
Nodes (6): COESA Institutional Geometric Pattern, Spiral-Diamond-Cross Central Motif (Chiapaneco Heart), Gobierno de Chiapas 2024-2030 Endorsement Line, Tagline: Humanismo Que Transforma, COESA Logo - Comisión Estatal de Simplificación Administrativa, Privacy Notice QR Code with Embedded COESA Logo

### Community 39 - "Header & Notification Icons"
Cohesion: 0.40
Nodes (6): Header Notifications Icon, Header UI Pattern, Header Search Icon, Search, Nav Notifications Icon, Notifications Navigation

### Community 40 - "Backup Restore Check"
Cohesion: 0.47
Nodes (5): dir, password, rclone(), run(), sql()

### Community 41 - "Backup Run"
Cohesion: 0.40
Nodes (5): dir, password, rclone(), run(), timestamp

### Community 42 - "API Templates Test"
Cohesion: 0.40
Nodes (4): collection, get(), requests, sandbox()

### Community 44 - "Chiapas Shield Branding"
Cohesion: 0.60
Nodes (5): Android drawable-nodpi Asset, Chiapas Shield Government Asset (PNG), Official Coat of Arms of Chiapas, Gobierno del Estado de Chiapas (State Government Branding), Government Branding/Splash Icon Usage

### Community 47 - "Form Field Factories"
Cohesion: 0.50
Nodes (3): Factory, Factory, T

### Community 48 - "Brand & Privacy QR"
Cohesion: 0.67
Nodes (4): brand_full.png (E-Ventanilla logo), E-Ventanilla brand identity, privacy_qr.png (QR code), Privacy notice QR link

### Community 50 - "Gradle Wrapper"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 52 - "Restore Check Compose"
Cohesion: 0.83
Nodes (3): cleanup(), compose(), run-restore-check.sh script

### Community 53 - "Prettier Config"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 54 - "Inter Font License"
Cohesion: 0.67
Nodes (3): Inter Font SIL Open Font License 1.1, Inter Font Project (rsms/inter), SIL Open Font License v1.1

### Community 55 - "SecLists Licenses"
Cohesion: 1.00
Nodes (3): SecLists MIT License (Android assets copy), SecLists MIT License (API resources copy), SecLists Security Wordlist Corpus (Daniel Miessler)

### Community 57 - "Brand Identity Concepts"
Cohesion: 0.67
Nodes (3): E-Ventanilla Brand Full Logo (App Icon with Calendar-Check and Person, Wordmark), Citizen Appointment Scheduling (Ventanilla Digital Service), E-Ventanilla Product Brand Identity

## Ambiguous Edges - Review These
- `Instrumented Tests on Android Emulator (API 35)` → `Network: proxy_net (external)`  [AMBIGUOUS]
  .github/workflows/checks.yml · relation: conceptually_related_to

## Knowledge Gaps
- **200 isolated node(s):** `singleQuote`, `printWidth`, `trailingComma`, `LOGIN`, `REGISTER` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 316 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Instrumented Tests on Android Emulator (API 35)` and `Network: proxy_net (external)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `EVentanillaApp()` connect `App Theme & Baseline` to `Access Coordination & Auth Repo`, `Catalog Screens & Data`, `Recovery Flow & API Client`, `Auth Screens & State`, `Institutional Design System`, `Catalog UI Tests`, `Recovery Screens & Form Fields`, `Institutional UI Tests`, `Empty Auth Capture Tests`, `Profile Screen`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `CatalogRepository` connect `App Theme & Baseline` to `Access Coordination & Auth Repo`, `Catalog Screens & Data`, `Recovery Flow & API Client`, `Catalog UI Tests`, `Institutional UI Tests`, `Empty Auth Capture Tests`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `AuthResources` connect `Auth Resources & Previews` to `App Theme & Baseline`, `Delivery Status & Verify Screen`, `Access Coordination & Auth Repo`, `Recovery Flow & API Client`, `Dev Tools Auth Lab`, `Auth Screens & State`, `Auth Lab UI Tests`, `Catalog UI Tests`, `Recovery Screens & Form Fields`, `Institutional UI Tests`, `Empty Auth Capture Tests`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `EVentanillaTheme()` (e.g. with `.anonymousAppointmentRequiresLoginBeforeVerification()` and `.expiredTrackingCanBeRetakenWithoutResendingOrReplacingTheSession()`) actually correct?**
  _`EVentanillaTheme()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `AccessCoordinator` (e.g. with `.show()` and `.show()`) actually correct?**
  _`AccessCoordinator` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `EVentanillaApp()` (e.g. with `.anonymousAppointmentRequiresLoginBeforeVerification()` and `.expiredTrackingCanBeRetakenWithoutResendingOrReplacingTheSession()`) actually correct?**
  _`EVentanillaApp()` has 23 INFERRED edges - model-reasoned connections that need verification._