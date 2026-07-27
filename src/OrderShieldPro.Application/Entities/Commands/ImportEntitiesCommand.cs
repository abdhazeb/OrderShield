using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;

namespace OrderShieldPro.Application.Entities.Commands;

/// <summary>
/// Bulk-creates trade entities from an uploaded spreadsheet (Cantoon or Qicha template —
/// see <see cref="OrderShieldPro.Application.Common.Interfaces.IEntityImportService"/>).
/// Rows whose legal name already exists (in the file itself, or already in the database)
/// are skipped rather than creating a duplicate entity.
/// </summary>
public record ImportEntitiesCommand(byte[] FileBytes, string FileName) : IRequest<Result<EntityImportResultDto>>;
