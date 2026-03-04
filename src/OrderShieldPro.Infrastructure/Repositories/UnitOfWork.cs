using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private ITradeEntityRepository? _tradeEntities;
    private IReviewRepository? _reviews;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    public ITradeEntityRepository TradeEntities =>
        _tradeEntities ??= new TradeEntityRepository(_context);

    public IReviewRepository Reviews =>
        _reviews ??= new ReviewRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
