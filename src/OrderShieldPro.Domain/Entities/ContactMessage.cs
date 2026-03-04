using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// A message submitted via the "Contact Us" form.
/// Visible to admins in the admin dashboard.
/// </summary>
public class ContactMessage : BaseEntity
{
    /// <summary>Sender's full name.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Sender's email address.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Message subject / category.</summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>Message body.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional: logged-in user ID.</summary>
    public string? UserId { get; set; }

    /// <summary>Whether an admin has read this message.</summary>
    public bool IsRead { get; set; }

    /// <summary>When the message was read by admin.</summary>
    public DateTime? ReadAt { get; set; }
}
