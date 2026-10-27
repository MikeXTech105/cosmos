/*
 Phase 4 increment 1: canonical legal-company/branch masters and Sales scope.
 Additive only. Existing Sales invoices and GST registrations remain unscoped;
 no business data is backfilled or reinterpreted by this migration.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
CREATE TABLE dbo.Companies
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Companies PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(250) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Companies_IsActive DEFAULT(1),
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Companies_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedAtUtc DATETIME2 NULL, UpdatedBy BIGINT NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_Companies_IsDeleted DEFAULT(0)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Companies') AND name=N'UX_Companies_Code_Active')
CREATE UNIQUE INDEX UX_Companies_Code_Active ON dbo.Companies(Code) WHERE IsDeleted=0;
GO

IF OBJECT_ID(N'dbo.Branches', N'U') IS NULL
CREATE TABLE dbo.Branches
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Branches PRIMARY KEY,
    CompanyId BIGINT NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(250) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Branches_IsActive DEFAULT(1),
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Branches_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedAtUtc DATETIME2 NULL, UpdatedBy BIGINT NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_Branches_IsDeleted DEFAULT(0),
    CONSTRAINT FK_Branches_Companies FOREIGN KEY(CompanyId) REFERENCES dbo.Companies(Id),
    CONSTRAINT UQ_Branches_Id_Company UNIQUE(Id, CompanyId)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Branches') AND name=N'UX_Branches_Company_Code_Active')
CREATE UNIQUE INDEX UX_Branches_Company_Code_Active ON dbo.Branches(CompanyId,Code) WHERE IsDeleted=0;
GO

IF OBJECT_ID(N'dbo.UserCompanyBranchScopes', N'U') IS NULL
CREATE TABLE dbo.UserCompanyBranchScopes
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserCompanyBranchScopes PRIMARY KEY,
    UserId INT NOT NULL, CompanyId BIGINT NOT NULL, BranchId BIGINT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_UserCompanyBranchScopes_IsActive DEFAULT(1),
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_UserCompanyBranchScopes_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CreatedBy BIGINT NULL, UpdatedAtUtc DATETIME2 NULL, UpdatedBy BIGINT NULL,
    CONSTRAINT FK_UserCompanyBranchScopes_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_UserCompanyBranchScopes_Companies FOREIGN KEY(CompanyId) REFERENCES dbo.Companies(Id),
    CONSTRAINT FK_UserCompanyBranchScopes_BranchCompany FOREIGN KEY(BranchId,CompanyId) REFERENCES dbo.Branches(Id,CompanyId)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.UserCompanyBranchScopes') AND name=N'UX_UserCompanyBranchScopes_Active')
CREATE UNIQUE INDEX UX_UserCompanyBranchScopes_Active ON dbo.UserCompanyBranchScopes(UserId,CompanyId,BranchId) WHERE IsActive=1;
GO

IF COL_LENGTH(N'dbo.SalesInvoices',N'CompanyId') IS NULL ALTER TABLE dbo.SalesInvoices ADD CompanyId BIGINT NULL;
IF COL_LENGTH(N'dbo.SalesInvoices',N'BranchId') IS NULL ALTER TABLE dbo.SalesInvoices ADD BranchId BIGINT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_SalesInvoices_Companies')
ALTER TABLE dbo.SalesInvoices ADD CONSTRAINT FK_SalesInvoices_Companies FOREIGN KEY(CompanyId) REFERENCES dbo.Companies(Id);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_SalesInvoices_BranchCompany')
ALTER TABLE dbo.SalesInvoices ADD CONSTRAINT FK_SalesInvoices_BranchCompany FOREIGN KEY(BranchId,CompanyId) REFERENCES dbo.Branches(Id,CompanyId);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.SalesInvoices') AND name=N'CK_SalesInvoices_BranchRequiresCompany')
ALTER TABLE dbo.SalesInvoices ADD CONSTRAINT CK_SalesInvoices_BranchRequiresCompany CHECK(BranchId IS NULL OR CompanyId IS NOT NULL);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.SalesInvoices') AND name=N'IX_SalesInvoices_Company_Branch')
CREATE INDEX IX_SalesInvoices_Company_Branch ON dbo.SalesInvoices(CompanyId,BranchId) WHERE CompanyId IS NOT NULL;
GO

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_CompanyGstRegistrations_Companies')
ALTER TABLE dbo.CompanyGstRegistrations ADD CONSTRAINT FK_CompanyGstRegistrations_Companies FOREIGN KEY(CompanyId) REFERENCES dbo.Companies(Id);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_CompanyGstRegistrations_BranchCompany')
ALTER TABLE dbo.CompanyGstRegistrations ADD CONSTRAINT FK_CompanyGstRegistrations_BranchCompany FOREIGN KEY(BranchId,CompanyId) REFERENCES dbo.Branches(Id,CompanyId);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.CompanyGstRegistrations') AND name=N'CK_CompanyGstRegistrations_BranchRequiresCompany')
ALTER TABLE dbo.CompanyGstRegistrations ADD CONSTRAINT CK_CompanyGstRegistrations_BranchRequiresCompany CHECK(BranchId IS NULL OR CompanyId IS NOT NULL);
GO

CREATE OR ALTER PROCEDURE dbo.sp_CompanyBranchScope_CanAccess
 @UserId INT,@CompanyId BIGINT=NULL,@BranchId BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;
 SELECT CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@UserId AND IsActive=1 AND IsDeleted=0 AND IsSystemUser=1) THEN 1
 WHEN @CompanyId IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.UserCompanyBranchScopes s WHERE s.UserId=@UserId AND s.CompanyId=@CompanyId AND s.IsActive=1 AND ((@BranchId IS NULL AND s.BranchId IS NULL) OR (@BranchId IS NOT NULL AND (s.BranchId IS NULL OR s.BranchId=@BranchId)))) THEN 1
 ELSE 0 END) AS CanAccess;
END;
GO

/* Guard against silently applying this migration to an unexpected Sales procedure revision. */
DECLARE @createDefinition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_SalesInvoice_Create'));
DECLARE @updateDefinition NVARCHAR(MAX)=OBJECT_DEFINITION(OBJECT_ID(N'dbo.sp_SalesInvoice_Update'));
IF @createDefinition IS NULL OR @updateDefinition IS NULL OR CHARINDEX(N'@CompanyGstRegistrationId BIGINT=NULL',@createDefinition)=0 OR CHARINDEX(N'@CompanyGstRegistrationId BIGINT=NULL',@updateDefinition)=0
 THROW 51230,N'Expected Phase 3 Sales invoice procedure definitions are not installed; review before applying company/branch scope migration.',1;

/* Exact textual changes preserve all current stock/ownership guards in the deployed bodies. */
DECLARE @createPosition INT=CHARINDEX(N'CREATE',UPPER(@createDefinition)), @procedurePosition INT=CHARINDEX(N'PROCEDURE',UPPER(@createDefinition),CHARINDEX(N'CREATE',UPPER(@createDefinition)));
IF @createPosition=0 OR @procedurePosition=0 THROW 51231,N'Unable to normalize Sales create procedure header.',1;
SET @createDefinition=STUFF(@createDefinition,@createPosition,@procedurePosition+LEN(N'PROCEDURE')-@createPosition,N'ALTER PROCEDURE');
SET @createDefinition=REPLACE(@createDefinition,N'@CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode',N'@CompanyId BIGINT,@BranchId BIGINT=NULL,@CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode');
SET @createDefinition=REPLACE(@createDefinition,N'IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND IsDeleted=0 AND Status=N''Active'') BEGIN SELECT 409 StatusCode,N''Selected GST registration was not found or is inactive.'' Message; RETURN; END',N'IF @CompanyId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.Companies WHERE Id=@CompanyId AND IsActive=1 AND IsDeleted=0) OR (@BranchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Branches WHERE Id=@BranchId AND CompanyId=@CompanyId AND IsActive=1 AND IsDeleted=0)) BEGIN SELECT 400 StatusCode,N''An active company and matching branch are required.'' Message; RETURN; END IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND CompanyId=@CompanyId AND ((@BranchId IS NULL AND BranchId IS NULL) OR BranchId=@BranchId) AND IsDeleted=0 AND Status=N''Active'') BEGIN SELECT 409 StatusCode,N''Selected GST registration is not active for the invoice company and branch.'' Message; RETURN; END');
SET @createDefinition=REPLACE(@createDefinition,N'CustomerPartyId,CompanyGstRegistrationId,PlaceOfSupplyStateCode',N'CustomerPartyId,CompanyId,BranchId,CompanyGstRegistrationId,PlaceOfSupplyStateCode');
SET @createDefinition=REPLACE(@createDefinition,N'@CustomerPartyId,@CompanyGstRegistrationId,@PlaceOfSupplyStateCode',N'@CustomerPartyId,@CompanyId,@BranchId,@CompanyGstRegistrationId,@PlaceOfSupplyStateCode');
EXEC sp_executesql @createDefinition;

SET @createPosition=CHARINDEX(N'CREATE',UPPER(@updateDefinition)); SET @procedurePosition=CHARINDEX(N'PROCEDURE',UPPER(@updateDefinition),@createPosition);
IF @createPosition=0 OR @procedurePosition=0 THROW 51232,N'Unable to normalize Sales update procedure header.',1;
SET @updateDefinition=STUFF(@updateDefinition,@createPosition,@procedurePosition+LEN(N'PROCEDURE')-@createPosition,N'ALTER PROCEDURE');
SET @updateDefinition=REPLACE(@updateDefinition,N'@CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode',N'@CompanyId BIGINT,@BranchId BIGINT=NULL,@CompanyGstRegistrationId BIGINT=NULL,@PlaceOfSupplyStateCode');
SET @updateDefinition=REPLACE(@updateDefinition,N'IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND IsDeleted=0 AND Status=N''Active'') BEGIN SELECT 409 StatusCode,N''Selected GST registration was not found or is inactive.'' Message; RETURN; END',N'IF @CompanyId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.Companies WHERE Id=@CompanyId AND IsActive=1 AND IsDeleted=0) OR (@BranchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Branches WHERE Id=@BranchId AND CompanyId=@CompanyId AND IsActive=1 AND IsDeleted=0)) BEGIN SELECT 400 StatusCode,N''An active company and matching branch are required.'' Message; RETURN; END IF @CompanyGstRegistrationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.CompanyGstRegistrations WHERE Id=@CompanyGstRegistrationId AND CompanyId=@CompanyId AND ((@BranchId IS NULL AND BranchId IS NULL) OR BranchId=@BranchId) AND IsDeleted=0 AND Status=N''Active'') BEGIN SELECT 409 StatusCode,N''Selected GST registration is not active for the invoice company and branch.'' Message; RETURN; END');
SET @updateDefinition=REPLACE(@updateDefinition,N'CustomerPartyId=@CustomerPartyId,CompanyGstRegistrationId=',N'CustomerPartyId=@CustomerPartyId,CompanyId=@CompanyId,BranchId=@BranchId,CompanyGstRegistrationId=');
EXEC sp_executesql @updateDefinition;
GO
