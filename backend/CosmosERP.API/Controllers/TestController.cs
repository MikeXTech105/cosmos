using CosmosERP.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CosmosERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("hello")]
        public IActionResult Hello()
        {
            return Ok(new
            {
                message = "Cosmos ERP API Working"
            });
        }

        [HttpGet("db-test")]
        public async Task<IActionResult> DbTest()
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync("SELECT 1");

                return Ok(new
                {
                    success = true,
                    message = "Database Connected Successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
