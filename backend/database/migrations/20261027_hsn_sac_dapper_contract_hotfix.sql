/*
   Aligns usp_HsnSac_Get with the HsnSacDto constructor used by Dapper.
   Safe to rerun: modifies only dbo.usp_HsnSac_Get and does not change data.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_HsnSac_Get
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id,
           Code,
           CodeType,
           Description,
           IsActive,
           CreatedAtUtc,
           UpdatedAtUtc,
           CAST(0 AS INT) AS TotalCount
    FROM dbo.HsnSacMasters
    WHERE Id = @Id
      AND IsDeleted = 0;
END;
GO
