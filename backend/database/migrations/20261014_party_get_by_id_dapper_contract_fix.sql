/*
    Keeps sp_Party_GetById compatible with the positional PartyDto constructor.
    PartyType is the fourth PartyDto constructor parameter and must be selected
    between PartyName and MobileNo.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN, LegalName, TradeName,
           BillingAddressLine1, BillingAddressLine2, BillingCity, BillingState, BillingCountry, BillingPincode,
           ShippingAddressLine1, ShippingAddressLine2, ShippingCity, ShippingState, ShippingCountry, ShippingPincode,
           OpeningBalance, OpeningBalanceType, CreditLimit, CreditPeriodDays, IsActive, CreatedOn, CreatedBy,
           ModifiedOn, ModifiedBy, IsDeleted, DeletedOn, RowVersion
    FROM dbo.Parties
    WHERE Id = @Id AND IsDeleted = 0;
END;
GO
