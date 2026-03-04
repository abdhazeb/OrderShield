using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AuthPolicy")]
public class ContactController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ContactController(ApplicationDbContext context)
    {
        _context = context;
    }

    public record ContactRequest(
        [Required, StringLength(200, MinimumLength = 2)] string FullName,
        [Required, EmailAddress, StringLength(256)] string Email,
        [Required, StringLength(300, MinimumLength = 2)] string Subject,
        [Required, StringLength(5000, MinimumLength = 10)] string Message);

    /// <summary>
    /// Submit a contact message (public — no auth required).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ContactRequest request, CancellationToken ct)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var message = new ContactMessage
        {
            FullName = request.FullName,
            Email = request.Email,
            Subject = request.Subject,
            Message = request.Message,
            UserId = userId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.ContactMessages.Add(message);
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Your message has been sent. We'll get back to you soon." });
    }

    /// <summary>
    /// Get all contact messages (admin only).
    /// </summary>
    [HttpGet]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,ServiceTeam,SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var query = _context.ContactMessages.AsNoTracking().OrderByDescending(m => m.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new
            {
                m.Id,
                m.FullName,
                m.Email,
                m.Subject,
                m.Message,
                m.UserId,
                m.IsRead,
                m.ReadAt,
                m.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new { items, totalCount = total, page, pageSize });
    }

    /// <summary>
    /// Mark a contact message as read (admin only).
    /// </summary>
    [HttpPut("{id:guid}/read")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,ServiceTeam,SuperAdmin")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        var message = await _context.ContactMessages.FindAsync(new object[] { id }, ct);
        if (message == null) return NotFound();

        message.IsRead = true;
        message.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return NoContent();
    }
}
