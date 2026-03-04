namespace OrderShieldPro.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    ITradeEntityRepository TradeEntities { get; }
    IReviewRepository Reviews { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
