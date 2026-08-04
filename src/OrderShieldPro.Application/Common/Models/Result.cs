namespace OrderShieldPro.Application.Common.Models;

/// <summary>
/// A wrapper for operation results supporting Success/Failure patterns.
/// </summary>
public class Result
{
    internal Result(bool succeeded, IEnumerable<string> errors, string? code = null)
    {
        Succeeded = succeeded;
        Errors = errors.ToArray();
        Code = code;
    }

    public bool Succeeded { get; }
    public string[] Errors { get; }

    /// <summary>
    /// Optional stable identifier for *why* an operation failed, for the rare refusal the
    /// UI has to phrase itself. <see cref="Errors"/> is English prose written for API
    /// consumers and log readers; a localized app cannot display it, and matching on its
    /// wording would break the moment the wording changes. Controllers that surface a code
    /// must return it alongside the errors.
    /// </summary>
    public string? Code { get; }

    public static Result Success() => new(true, Array.Empty<string>());
    public static Result Failure(IEnumerable<string> errors) => new(false, errors);
    public static Result Failure(string error) => new(false, new[] { error });
    public static Result Failure(string error, string code) => new(false, new[] { error }, code);
}

/// <summary>
/// Generic result wrapper with a typed data payload.
/// </summary>
public class Result<T> : Result
{
    internal Result(bool succeeded, T? data, IEnumerable<string> errors)
        : base(succeeded, errors)
    {
        Data = data;
    }

    public T? Data { get; }

    public static Result<T> Success(T data) => new(true, data, Array.Empty<string>());
    public new static Result<T> Failure(IEnumerable<string> errors) => new(false, default, errors);
    public new static Result<T> Failure(string error) => new(false, default, new[] { error });
}
