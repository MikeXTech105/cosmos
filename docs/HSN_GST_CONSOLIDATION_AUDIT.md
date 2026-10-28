# HSN/GST consolidation audit

Date: 2026-10-27. Source inspection found two item-level HSN paths: the canonical `Items.HSNCode`/`Items.GSTRate` fields used by item CRUD, and an effective-dated classification subsystem introduced by the 20261015 migrations.

| Area | Finding | Disposition |
|---|---|---|
| Item CRUD | `ItemRepository`, item commands, DTOs and `sp_Item_*` map `HSNCode` and `GSTRate`. | Canonical source retained. |
| Item UI | `ItemFormPage.jsx` had Taxes plus a separate HSN/SAC override panel. | Override panel removed. |
| Sales | `InvoiceFormPage.jsx` requested both the item and `/gst/items/{id}/effective-classification`. | Uses Item HSN/GST only. Invoice HSN text remains a line snapshot. |
| Classification API | `HsnGstController.cs` exposed master, category-default, and item-override endpoints. | Classification routes removed; rate-history routes retained. |
| Classification schema | `HsnSacMasters`, `ItemHsnOverrides`, `CategoryHsnDefaults`; later GST snapshot tables reference this data. | Not dropped automatically; recovery/report migration guards data. |
| Reports | Sales/purchase reports expose `hsnSacCode` as document text. | Retained because it is historical transaction output, not item-master configuration. |

No connection string is committed in `backend/src/Cosmos.API/appsettings.json`; therefore no live SQL Server environment was identified or modified by this change.
