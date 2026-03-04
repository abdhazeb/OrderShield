namespace OrderShieldPro.Application.Common.Exceptions;

/// <summary>
/// Exception thrown when the user does not have permission to perform an action.
/// </summary>
public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException() : base("You do not have permission to perform this action.") { }

    public ForbiddenAccessException(string message) : base(message) { }
}
