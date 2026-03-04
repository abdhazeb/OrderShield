using MediatR;
using Microsoft.Extensions.Logging;
using OrderShieldPro.Application.Common.Interfaces;
using System.Diagnostics;

namespace OrderShieldPro.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that logs request execution with timing.
/// </summary>
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserService _currentUserService;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger, ICurrentUserService currentUserService)
    {
        _logger = logger;
        _currentUserService = currentUserService;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var userId = _currentUserService.UserId ?? "Anonymous";

        _logger.LogInformation("OrderShieldPro Request: {Name} by {UserId}", requestName, userId);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();
            stopwatch.Stop();

            if (stopwatch.ElapsedMilliseconds > 500)
            {
                _logger.LogWarning("OrderShieldPro Long Running Request: {Name} ({ElapsedMs} ms) by {UserId}",
                    requestName, stopwatch.ElapsedMilliseconds, userId);
            }

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "OrderShieldPro Request Failed: {Name} ({ElapsedMs} ms) by {UserId}",
                requestName, stopwatch.ElapsedMilliseconds, userId);
            throw;
        }
    }
}
