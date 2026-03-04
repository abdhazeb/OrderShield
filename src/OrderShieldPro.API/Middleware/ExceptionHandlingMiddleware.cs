using System.Net;
using System.Text.Json;
using FluentValidation;

namespace OrderShieldPro.API.Middleware;

/// <summary>
/// Global exception handling middleware — catches all unhandled exceptions
/// and returns standardized ProblemDetails responses.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail, errors) = exception switch
        {
            Application.Common.Exceptions.ValidationException validationEx =>
                (HttpStatusCode.BadRequest, "Validation Error", "One or more validation errors occurred.",
                    validationEx.Errors),

            FluentValidation.ValidationException fluentEx =>
                (HttpStatusCode.BadRequest, "Validation Error", "One or more validation errors occurred.",
                    fluentEx.Errors
                        .GroupBy(e => e.PropertyName, e => e.ErrorMessage)
                        .ToDictionary(g => g.Key, g => g.ToArray()) as IDictionary<string, string[]>),

            Application.Common.Exceptions.NotFoundException =>
                (HttpStatusCode.NotFound, "Not Found", exception.Message,
                    null as IDictionary<string, string[]>),

            Application.Common.Exceptions.ForbiddenAccessException =>
                (HttpStatusCode.Forbidden, "Forbidden", exception.Message,
                    null as IDictionary<string, string[]>),

            UnauthorizedAccessException =>
                (HttpStatusCode.Unauthorized, "Unauthorized", "You are not authorized to perform this action.",
                    null as IDictionary<string, string[]>),

            _ =>
                (HttpStatusCode.InternalServerError, "Server Error", "An unexpected error occurred.",
                    null as IDictionary<string, string[]>)
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
        }
        else
        {
            _logger.LogWarning("Handled exception: {Type} — {Message}", exception.GetType().Name, exception.Message);
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var problemDetails = new
        {
            type = $"https://httpstatuses.com/{(int)statusCode}",
            title,
            status = (int)statusCode,
            detail,
            errors,
            traceId = context.TraceIdentifier
        };

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        await context.Response.WriteAsync(json);
    }
}
