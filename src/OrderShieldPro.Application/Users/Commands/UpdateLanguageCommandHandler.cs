using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Users.Commands;

public class UpdateLanguageCommandHandler : IRequestHandler<UpdateLanguageCommand, Result>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService;

    public UpdateLanguageCommandHandler(IIdentityService identityService, ICurrentUserService currentUserService)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(UpdateLanguageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        return await _identityService.UpdateLanguageAsync(
            _currentUserService.UserId, request.Language.ToString(), cancellationToken);
    }
}
