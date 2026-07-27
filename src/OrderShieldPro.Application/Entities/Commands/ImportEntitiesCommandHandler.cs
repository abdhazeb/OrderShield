using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.Commands;

public class ImportEntitiesCommandHandler : IRequestHandler<ImportEntitiesCommand, Result<EntityImportResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IEntityImportService _importService;
    private readonly ICurrentUserService _currentUserService;

    public ImportEntitiesCommandHandler(
        IApplicationDbContext context,
        IEntityImportService importService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _importService = importService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<EntityImportResultDto>> Handle(ImportEntitiesCommand request, CancellationToken cancellationToken)
    {
        using var stream = new MemoryStream(request.FileBytes);
        var parseResult = _importService.Parse(stream, request.FileName);
        if (!parseResult.Succeeded)
            return Result<EntityImportResultDto>.Failure(parseResult.Errors);

        var rows = parseResult.Data!;

        var invalidCount = rows.Count(r => string.IsNullOrWhiteSpace(r.LegalName));
        var validRows = rows.Where(r => !string.IsNullOrWhiteSpace(r.LegalName)).ToList();

        // Dedup within the file itself — first occurrence of a legal name wins, later
        // repeats of the same name are dropped before we ever touch the database.
        var seenInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var dedupedRows = new List<ParsedEntityRow>();
        foreach (var row in validRows)
        {
            if (seenInFile.Add(row.LegalName.Trim()))
                dedupedRows.Add(row);
        }
        var inFileDuplicateCount = validRows.Count - dedupedRows.Count;

        // Dedup against entities that already exist, regardless of which import (or
        // manual entry) created them.
        var existingNames = await _context.TradeEntities
            .Select(e => e.LegalName)
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingNames, StringComparer.OrdinalIgnoreCase);

        var created = 0;
        var skippedDbDuplicates = 0;

        foreach (var row in dedupedRows)
        {
            var legalName = row.LegalName.Trim();
            if (existingSet.Contains(legalName))
            {
                skippedDbDuplicates++;
                continue;
            }

            var entity = new TradeEntity
            {
                LegalName = legalName,
                TradeName = string.IsNullOrWhiteSpace(row.TradeName) ? null : row.TradeName!.Trim(),
                EntityType = EntityType.Supplier,
                Country = row.Country,
                Region = string.IsNullOrWhiteSpace(row.Region) ? null : row.Region!.Trim(),
                City = string.IsNullOrWhiteSpace(row.City) ? null : row.City!.Trim(),
                ProductCategories = string.IsNullOrWhiteSpace(row.ProductCategories) ? null : row.ProductCategories,
                ExternalRegistryLinks = string.IsNullOrWhiteSpace(row.Website)
                    ? null
                    : JsonSerializer.Serialize(new[] { row.Website.Trim() }),
                CreatedBy = _currentUserService.UserId
            };

            foreach (var phone in row.PhoneNumbers.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                entity.PhoneNumbers.Add(new EntityPhoneNumber
                {
                    TradeEntityId = entity.Id,
                    PhoneNumber = phone.Trim()
                });
            }

            _context.TradeEntities.Add(entity);

            // Guard against two rows in the same file sharing a name that neither one
            // matches in the database (in-file dedup already prevents this, but this
            // keeps the invariant explicit rather than relying solely on that).
            existingSet.Add(legalName);
            created++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<EntityImportResultDto>.Success(new EntityImportResultDto
        {
            TotalRows = rows.Count,
            Created = created,
            SkippedDuplicates = inFileDuplicateCount + skippedDbDuplicates,
            SkippedInvalid = invalidCount
        });
    }
}
