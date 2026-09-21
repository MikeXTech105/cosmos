# Manufacturing frontend integration

Provide Items with a manufacturing flag, then screens for Manufacturing → BOM, Production, and Reports. Use the `manufacturing` Swagger document. A production is editable only while Draft; call `/post` to apply stock and `/cancel` with a reason to reverse it. Display server conflict messages for insufficient material rather than predicting stock client-side.
