using System.Diagnostics;

namespace OrderShieldPro.API.Middleware;

/// <summary>
/// Logs HTTP request method, path, status code, and elapsed time.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var method = context.Request.Method;
        var path = context.Request.Path;

        try
        {
            await _next(context);
            stopwatch.Stop();

            var statusCode = context.Response.StatusCode;

            if (stopwatch.ElapsedMilliseconds > 500)
            {
                _logger.LogWarning("HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms [SLOW]",
                    method, path, statusCode, stopwatch.ElapsedMilliseconds);
            }
            else
            {
                _logger.LogInformation("HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                    method, path, statusCode, stopwatch.ElapsedMilliseconds);
            }
        }
        catch (Exception)
        {
            stopwatch.Stop();
            _logger.LogError("HTTP {Method} {Path} FAILED after {ElapsedMs}ms",
                method, path, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
