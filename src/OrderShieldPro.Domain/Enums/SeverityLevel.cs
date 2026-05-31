namespace OrderShieldPro.Domain.Enums;

public enum SeverityLevel
{
    // --- Severity tiers ---
    Info = 0,
    Warning = 1,
    Critical = 2,

    // --- Negative / risk categories ---
    Behavior = 3,
    Fraud = 4,
    Quality = 5,
    Delivery = 6,
    Payment = 7,
    FinanciallyDistressed = 8,
    Bankrupt = 9,
    PoorManagement = 10,
    InaccurateAppointments = 11,
    BribeOthers = 12,
    FakeSupplier = 13,
    Other = 14,

    // --- Positive / commendation categories ---
    // Encourage suppliers by allowing reviewers to highlight good experiences.
    Positive = 15,
    Recommended = 16,
    HighQuality = 17,
    OnTimeDelivery = 18,
    GoodCommunication = 19,
    Reliable = 20
}
