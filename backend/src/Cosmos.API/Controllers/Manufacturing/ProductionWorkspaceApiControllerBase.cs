using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Manufacturing;

[ProducesResponseType(typeof(ApiResponse),400)]
[ProducesResponseType(typeof(ApiResponse),401)]
[ProducesResponseType(typeof(ApiResponse),403)]
[ProducesResponseType(typeof(ApiResponse),404)]
[ProducesResponseType(typeof(ApiResponse),409)]
public abstract class ProductionWorkspaceApiControllerBase:ApiControllerBase { }
