using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Application.Common.Behaviors;

namespace OrderShieldPro.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        // Register MediatR handlers
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // Register FluentValidation validators via assembly scanning
        var validatorType = typeof(IValidator<>);
        var validatorTypes = assembly.GetExportedTypes()
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .Where(t => t.GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == validatorType))
            .ToList();

        foreach (var type in validatorTypes)
        {
            var interfaces = type.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == validatorType);
            foreach (var @interface in interfaces)
            {
                services.AddTransient(@interface, type);
            }
        }

        return services;
    }
}
