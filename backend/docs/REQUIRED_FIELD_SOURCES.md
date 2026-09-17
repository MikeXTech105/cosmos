# Required Field Source Matrix

## Measured source mechanisms

Counts are search-result occurrences, not a claim that each is a distinct logical business field. A field can legitimately appear in create, update, import and procedure rules. The master ledger preserves the individual direct-rule evidence.

| Source mechanism | Count | Evidence / interpretation |
|---|---:|---|
| \`[Required]\` attributes | 0 | Repository-wide C# search found none. |
| FluentValidation \`.NotEmpty()\` / \`.NotNull()\` | 193 | Explicit presence rules in \`src/Cosmos.Application/Validators\`. |
| FluentValidation \`.GreaterThan(0)\` | 202 | Positive-ID/value rules; rules guarded by \`.When(x => ...HasValue)\` validate an optional value when supplied rather than require presence. |
| FluentValidation \`.Must(...)\` | 197 | Includes format, cross-field and conditional rules; only rules whose predicate rejects empty/null are required-field evidence. |
| Validator classes | 207 | All registered by \`AddValidatorsFromAssembly\` (\`DependencyInjection.cs:13\`). |
| Non-nullable reference type context | enabled | Each production project sets \`<Nullable>enable</Nullable>\`; non-nullability is an API/DTO contract signal and must be reviewed with binding/validator behavior. |
| EF Core \`.IsRequired()\` | 0 | No EF Core / \`DbContext\` implementation found. |
| SQL \`NOT NULL\` declarations | 1,548 | Script occurrences across base setup and migrations; see database ledger and its deployment-drift caution. |
| SQL FK declarations | 208 | Script occurrences; relationships add parent/key and delete-behaviour dependencies. |
| Procedure definitions | 485 | Parameters without defaults are required at the SQL-call contract layer unless a wrapper supplies them. |
| Direct nullable \`.Value\` access | 92 | Candidate implicit assumptions; each must be read with its adjacent guard. |
| String \`.Trim()\`/case conversion calls | 135 | Candidate implicit non-null assumptions; direct request-field cases are called out in the audit report. |
| Null-forgiving token matches | 30 | Review candidates only; token scan includes language constructs that are not input requirements. |

## Requirement-flow model in this repository

\`\`\`text
HTTP route/query/body/form
  -> [ApiController] binding and FluentValidation
  -> application service normalisation / business rules
  -> repository anonymous parameter object
  -> Dapper stored-procedure call
  -> procedure parameter validation and INSERT/UPDATE/SELECT/JOIN
  -> SQL column, check/default/index/FK/trigger
\`\`\`

The actual HTTP/controller inventory is [API_REQUIRED_FIELDS_MATRIX.md](API_REQUIRED_FIELDS_MATRIX.md); direct validation findings are [REQUIRED_FIELDS_MASTER.md](REQUIRED_FIELDS_MASTER.md); SQL object and nullability evidence is [DATABASE_REQUIRED_FIELDS.md](DATABASE_REQUIRED_FIELDS.md).

## External and security dependencies

\`GSTZen\` is an external required-field boundary: configuration validation and HTTP client registration are in \`src/Cosmos.Infrastructure/DependencyInjection.cs:28-34\` and \`src/Cosmos.Infrastructure/Gst/GstZenOptionsValidator.cs:15-62\`; payload-specific required members are validated in \`src/Cosmos.Application/Validators/GstValidators.cs\`. JWT credential/claim fields are security dependencies (\`src/Cosmos.Infrastructure/Security/JwtTokenService.cs\`, \`src/Cosmos.API/Middleware/JwtClaimsMiddleware.cs\`). Website upload/warranty fields also cross a file-storage boundary (\`src/Cosmos.Infrastructure/WebsiteManagement/LocalWebsiteFileStorage.cs\`, \`src/Cosmos.API/Controllers/WebsiteManagement/PublicWebsiteController.cs\`).

