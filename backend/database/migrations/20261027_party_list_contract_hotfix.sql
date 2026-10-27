/*
   Restores the Party list stored-procedure contract expected by the current API.
   Safe to rerun: modifies only dbo.sp_Party_GetList and does not change data.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Party_GetList
    @Search NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @SortBy NVARCHAR(50) = N'PartyName',
    @SortDirection NVARCHAR(4) = N'ASC',
    @IsActive BIT = NULL,
    @PartyType NVARCHAR(10) = NULL,
    @HasGstin BIT = NULL,
    @HasCreditLimit BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @PageNumber = CASE WHEN @PageNumber < 1 THEN 1 ELSE @PageNumber END;
    SET @PageSize = CASE WHEN @PageSize < 1 THEN 20 WHEN @PageSize > 200 THEN 200 ELSE @PageSize END;
    SET @SortBy = CASE WHEN @SortBy IN (N'PartyCode', N'PartyName', N'MobileNo', N'GSTIN', N'CreatedOn') THEN @SortBy ELSE N'PartyName' END;
    SET @SortDirection = CASE WHEN UPPER(@SortDirection) = N'DESC' THEN N'DESC' ELSE N'ASC' END;
    SET @PartyType = CASE LOWER(LTRIM(RTRIM(@PartyType)))
        WHEN N'customer' THEN N'Customer'
        WHEN N'supplier' THEN N'Supplier'
        WHEN N'both' THEN N'Both'
        ELSE NULL
    END;

    DECLARE @SearchPattern NVARCHAR(210) = CASE WHEN @Search IS NULL OR LTRIM(RTRIM(@Search)) = N'' THEN NULL ELSE N'%' + LTRIM(RTRIM(@Search)) + N'%' END;
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    DECLARE @Base TABLE
    (
        Id UNIQUEIDENTIFIER NOT NULL, PartyCode NVARCHAR(50) NOT NULL, PartyName NVARCHAR(200) NOT NULL,
        PartyType NVARCHAR(10) NOT NULL, MobileNo NVARCHAR(20) NULL, Email NVARCHAR(200) NULL, GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL, OpeningBalance DECIMAL(18,2) NOT NULL, OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL, CreditPeriodDays INT NOT NULL, IsActive BIT NOT NULL,
        CreatedOn DATETIME2(3) NOT NULL, ModifiedOn DATETIME2(3) NULL
    );

    INSERT INTO @Base
    SELECT p.Id, p.PartyCode, p.PartyName, p.PartyType, p.MobileNo, p.Email, p.GSTTreatment, p.GSTIN,
           p.OpeningBalance, p.OpeningBalanceType, p.CreditLimit, p.CreditPeriodDays, p.IsActive, p.CreatedOn, p.ModifiedOn
    FROM dbo.Parties p
    WHERE p.IsDeleted = 0
      AND (@IsActive IS NULL OR p.IsActive = @IsActive)
      AND (@HasGstin IS NULL OR (@HasGstin = 1 AND NULLIF(LTRIM(RTRIM(p.GSTIN)), N'') IS NOT NULL) OR (@HasGstin = 0 AND NULLIF(LTRIM(RTRIM(p.GSTIN)), N'') IS NULL))
      AND (@HasCreditLimit IS NULL OR (@HasCreditLimit = 1 AND p.CreditLimit > 0) OR (@HasCreditLimit = 0 AND p.CreditLimit <= 0))
      AND (@SearchPattern IS NULL OR p.PartyCode LIKE @SearchPattern OR p.PartyName LIKE @SearchPattern OR p.MobileNo LIKE @SearchPattern OR p.GSTIN LIKE @SearchPattern OR p.Email LIKE @SearchPattern);

    DECLARE @Filtered TABLE
    (
        Id UNIQUEIDENTIFIER NOT NULL, PartyCode NVARCHAR(50) NOT NULL, PartyName NVARCHAR(200) NOT NULL,
        PartyType NVARCHAR(10) NOT NULL, MobileNo NVARCHAR(20) NULL, Email NVARCHAR(200) NULL, GSTTreatment INT NOT NULL,
        GSTIN NVARCHAR(20) NULL, OpeningBalance DECIMAL(18,2) NOT NULL, OpeningBalanceType INT NOT NULL,
        CreditLimit DECIMAL(18,2) NOT NULL, CreditPeriodDays INT NOT NULL, IsActive BIT NOT NULL,
        CreatedOn DATETIME2(3) NOT NULL, ModifiedOn DATETIME2(3) NULL
    );

    INSERT INTO @Filtered SELECT * FROM @Base WHERE @PartyType IS NULL OR PartyType = @PartyType;

    SELECT Id, PartyCode, PartyName, PartyType, MobileNo, Email, GSTTreatment, GSTIN, OpeningBalance, OpeningBalanceType,
           CreditLimit, CreditPeriodDays, IsActive, CreatedOn, ModifiedOn, COUNT(1) OVER() AS TotalCount
    FROM @Filtered
    ORDER BY
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'ASC' THEN PartyCode END ASC,
        CASE WHEN @SortBy = N'PartyCode' AND @SortDirection = N'DESC' THEN PartyCode END DESC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'ASC' THEN PartyName END ASC,
        CASE WHEN @SortBy = N'PartyName' AND @SortDirection = N'DESC' THEN PartyName END DESC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'ASC' THEN MobileNo END ASC,
        CASE WHEN @SortBy = N'MobileNo' AND @SortDirection = N'DESC' THEN MobileNo END DESC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'ASC' THEN GSTIN END ASC,
        CASE WHEN @SortBy = N'GSTIN' AND @SortDirection = N'DESC' THEN GSTIN END DESC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'ASC' THEN CreatedOn END ASC,
        CASE WHEN @SortBy = N'CreatedOn' AND @SortDirection = N'DESC' THEN CreatedOn END DESC,
        PartyName ASC,
        Id ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(1) AS TotalCount FROM @Filtered;

    SELECT COUNT(1) AS AllCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Customer' THEN 1 ELSE 0 END), 0) AS CustomerCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Supplier' THEN 1 ELSE 0 END), 0) AS SupplierCount,
           COALESCE(SUM(CASE WHEN PartyType = N'Both' THEN 1 ELSE 0 END), 0) AS BothCount,
           COALESCE(SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END), 0) AS InactiveCount,
           COALESCE(SUM(CreditLimit), 0) AS TotalCreditLimit
    FROM @Base;
END;
GO
